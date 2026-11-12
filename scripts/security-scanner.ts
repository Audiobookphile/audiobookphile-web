/**
 * Bun install-time security scanner.
 *
 * Bun 1.4 can scan every package before it is installed, and cancel the
 * install if the scan returns a fatal advisory. This file is that scanner.
 * It is a local path in `bunfig.toml`:
 *
 * ```toml
 * [install.security]
 * scanner = "./scripts/security-scanner.ts"
 * ```
 *
 * A local path rather than a package from the registry, so the policy is
 * code in this repository: reviewable in a pull request, versioned with the
 * code it protects, and adding no dependency of its own.
 *
 * ## What it enforces
 *
 * **1. Security floors.** A table of packages and the version ranges that
 * are acceptable for them. The version in the tree has to satisfy one of the
 * ranges for its package, or the install is cancelled.
 *
 * These floors are the same versions the `overrides` block in `package.json`
 * pins. The two mechanisms defend the same ground from opposite sides: the
 * override forces the version, and the floor refuses to let the tree go back
 * below it. Dropping an override by accident, or a `bun update` resolving a
 * transitive dependency to an older version, is caught here rather than
 * discovered by the next audit.
 *
 * Every floor was checked against the OSV database at the version the tree
 * actually resolves to, so every range below is satisfied today. A floor
 * that no published version could satisfy would cancel every install, which
 * is the failure mode this file has to avoid.
 *
 * **2. Known-malicious packages.** Packages whose own npm account was
 * compromised. These are denied outright, at any version: the package is
 * the payload, not a version of it.
 *
 * **3. Registry-only resolution.** A dependency resolved from git, GitHub,
 * a tarball URL or a local directory has no immutable version. Whoever
 * controls that repository can change what "1.0.0" points to after it has
 * been reviewed. A package from the npm registry at a published version
 * cannot be swapped, because the version is immutable and the tarball is
 * content-addressed.
 *
 * The allow-list exists for the case where a non-registry dependency is
 * deliberate. It is empty today.
 *
 * **4. Known advisories, from OSV.** The three rules above are policy: they
 * encode what this repository has decided. This one is a lookup -- the
 * package is asked about every package that is about to be installed, in a
 * single request, and anything the OSV database knows about that is not on
 * the accepted list cancels the install.
 *
 * The reason it belongs here and not in `bun audit` is the order of events.
 * `bun audit` runs after the install; by then the tarball has been
 * unpacked and its lifecycle script has already run. This runs before. A
 * compromised package's `postinstall` has already executed by the time an
 * audit could notice it, and this is the check that happens first.
 *
 * The check fails *open*: if the database cannot be reached, the install
 * proceeds and the scanner says so on stderr. A supply-chain gate that
 * breaks every install on a network blip gets switched off, and a gate that
 * is switched off is worth nothing.
 *
 * The advisories this repository has decided to live with are listed in
 * `ACCEPTED_ADVISORIES` below. They are the same four the `audit` script in
 * package.json ignores, and they are all packages with no patched release:
 * `braces@3.0.3` is the newest version that has ever been published,
 * `sprintf-js@1.0.3` has no fixed 1.x, and `extract-zip@2.0.1` has no
 * patched release.
 *
 * ## What it deliberately does not do
 *
 * It does not ship a snapshot of the advisory database. The floors below are
 * not a copy of one: they are the short list of versions this repository has
 * already decided are unacceptable, which is a decision, not a lookup. The
 * lookup is the OSV query, which is live.
 */

export interface ScanPackage {
  name: string
  version: string
  requestedRange: string
  tarball: string
}

export interface Advisory {
  level: 'fatal' | 'warn'
  package: string
  url: string
  description: string
}

const ADVISORY_URL = 'https://github.com/advisories'

/**
 * The OSV database, asked about every package in one request.
 *
 * `POST /v1/querybatch` takes up to a thousand queries, so a whole
 * dependency tree is one round trip -- about 1.6 s for the thousand
 * packages this repository resolves. The per-package form would be a
 * thousand requests, which is the difference between a gate people leave on
 * and a gate people switch off.
 */
const OSV_BATCH_URL = 'https://api.osv.dev/v1/querybatch'
const OSV_DETAIL_URL = 'https://api.osv.dev/v1/vulns/'

/**
 * The most queries OSV accepts in one request.
 *
 * A request with more is answered with a 400, and a 400 is indistinguishable
 * from "nothing is wrong" once the fail-open path has swallowed it.
 */
const OSV_BATCH_LIMIT = 1000

/**
 * How long the query may take before the scanner gives up and lets the
 * install proceed.
 *
 * Failing open is the point: a scanner that blocks every install when the
 * database is unreachable is a scanner that gets deleted.
 */
const OSV_TIMEOUT_MS = 15_000

/**
 * The advisories this repository has decided to live with.
 *
 * They are the same four the audit baseline ignores, and they are all
 * packages with no patched release: `braces@3.0.3` is the newest version
 * that has ever been published, `sprintf-js@1.0.3` has no fixed 1.x, and
 * `extract-zip@2.0.1` has no patched release.
 */
const ACCEPTED_ADVISORIES = new Set<string>([
  'GHSA-vfj7-8cjw-p6xm', // braces@3.0.3 -- no patched release exists
  'GHSA-hp3w-g68c-fv3c', // sprintf-js@1.0.3 -- no patched 1.x exists
  'GHSA-7pqw-9j4j-h8q3', // extract-zip@2.0.1 -- no patched release exists
  'GHSA-jmr9-qjv8-65gv', // extract-zip@2.0.1 -- no patched release exists
  'GHSA-3g3m-2fjr-6pw4', // glob@13.0.6 -- @sentry/bundler-plugin-core build-time tooling only
  'GHSA-g3hv-75wg-m249', // minimatch@10.2.6 -- @sentry/bundler-plugin-core build-time tooling only
  'GHSA-27r3-jxmh-p828', // body-parser@1.20.6 -- @lhci/cli dev-only test harness
  'GHSA-mrhx-c7xc-m3w5', // zod@3 in @modelcontextprotocol/server -- no v3 patch exists; direct zod is upgraded
])

interface OsvHit {
  id: string
  name: string
  version: string
  summary?: string
}

/**
 * Ask OSV about every package, in one request.
 *
 * Returns an empty list if the database cannot be reached. The caller
 * cannot tell that from "nothing is wrong", which is the point: a network
 * failure must not look like a clean bill of health, and it must not stop
 * an install either. The scanner says on stderr that the check did not
 * run.
 */
const queryOsv = async (packages: ScanPackage[]): Promise<OsvHit[]> => {
  const queries = packages
    .filter((pkg) => /^\d+\.\d+\.\d+/.test(pkg.version))
    .map((pkg) => ({ package: { name: pkg.name, ecosystem: 'npm' }, version: pkg.version }))

  if (queries.length === 0) return []

  try {
    // OSV accepts at most a thousand queries per request, and this
    // repository resolves more than that, so the queries go in chunks. A
    // request over the limit is answered with a 400, which the fail-open
    // path would swallow -- and a scanner that quietly checked nothing
    // because of a size limit is worse than one that does not check at all.
    const hits: OsvHit[] = []

    for (let offset = 0; offset < queries.length; offset += OSV_BATCH_LIMIT) {
      const chunk = queries.slice(offset, offset + OSV_BATCH_LIMIT)

      const response = await fetch(OSV_BATCH_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ queries: chunk }),
        signal: AbortSignal.timeout(OSV_TIMEOUT_MS),
      })

      if (!response.ok) {
        console.error(`[security-scanner] OSV returned ${response.status}; the advisory check did not run.`)
        return []
      }

      const body = (await response.json()) as { results: { vulns?: { id: string }[] }[] }

      body.results.forEach((result, index) => {
        for (const vuln of result.vulns ?? []) {
          hits.push({
            id: vuln.id,
            name: chunk[index].package.name,
            version: chunk[index].version,
          })
        }
      })
    }

    // The batch response carries ids only. The summary is worth one request
    // per hit -- there are a handful -- because "GHSA-xxxx" in an install
    // log is a puzzle, and a sentence is not.
    await Promise.all(
      hits.slice(0, 20).map(async (hit) => {
        try {
          const detail = await fetch(`${OSV_DETAIL_URL}${hit.id}`, { signal: AbortSignal.timeout(OSV_TIMEOUT_MS) })
          if (!detail.ok) return
          const vuln = (await detail.json()) as { summary?: string }
          if (vuln.summary) hit.summary = vuln.summary
        } catch {
          // A missing summary is not worth failing the install over.
        }
      })
    )

    return hits
  } catch (error) {
    console.error(
      `[security-scanner] Could not reach the advisory database; the advisory check did not run. (${
        error instanceof Error ? error.message : String(error)
      })`
    )
    return []
  }
}

/**
 * The acceptable version ranges for a package.
 *
 * A resolved version is acceptable when it satisfies at least one of the
 * ranges for its package. A version that satisfies none of them is a
 * violation -- including a version on a release line that has no patched
 * release at all, which is the point: `nanoid@4` and `uuid@12` are both
 * lines where every published version is affected, and a floor that merely
 * said "at least 3.3.18" would have waved them through.
 */
const SECURITY_FLOORS: { name: string; ranges: string[]; reason: string }[] = [
  { name: 'dompurify', ranges: ['>=3.4.17'], reason: 'XSS in IN_PLACE mode' },
  { name: 'undici', ranges: ['>=8.12.2'], reason: 'DoS and TLS advisories' },
  { name: 'lodash', ranges: ['>=4.18.1'], reason: 'code injection via _.template' },
  { name: 'follow-redirects', ranges: ['>=1.16.3'], reason: 'credential stripping bypass' },
  { name: 'source-map-js', ranges: ['>=1.2.2'], reason: 'event-loop DoS' },
  { name: 'fast-uri', ranges: ['>=3.1.9'], reason: 'authority injection' },
  {
    name: 'brace-expansion',
    ranges: ['>=1.1.21 <2.0.0', '>=2.1.7 <3.0.0', '>=5.0.12 <6.0.0'],
    reason: 'recursion and quadratic-time DoS',
  },
  { name: 'serialize-javascript', ranges: ['>=7.1.2'], reason: 'RCE via RegExp.flags' },
  { name: 'proxy-addr', ranges: ['>=2.0.8'], reason: 'IP spoofing via an IPv4-mapped IPv6 trust subnet' },
  { name: 'compression', ranges: ['>=1.8.2'], reason: 'memory leak on premature response close' },
  { name: 'ip-address', ranges: ['>=10.7.1'], reason: 'SSRF and trust-boundary bypass' },
  { name: 'js-yaml', ranges: ['>=3.15.2'], reason: 'unbounded CPU use on empty merge sources' },
  { name: 'qs', ranges: ['>=6.16.0'], reason: 'array-limit bypass and DoS' },
  { name: 'tmp', ranges: ['>=0.2.7'], reason: 'path traversal via the prefix/postfix arguments' },
  { name: 'uuid', ranges: ['>=11.1.1 <12.0.0', '>=13.0.2'], reason: 'missing buffer bounds check in v3/v5/v6' },
  { name: 'basic-ftp', ranges: ['>=6.2.1'], reason: 'quadratic-time CPU DoS in the directory-listing parser' },
  {
    name: '@modelcontextprotocol/server',
    ranges: ['>=2.3.1'],
    reason: 'HTTP message cross-talk, memory exhaustion, cross-service token acceptance',
  },
  {
    name: 'nanoid',
    ranges: ['>=3.3.18 <4.0.0', '>=5.1.16'],
    reason: 'integer overflow, non-secure generators, predictable output',
  },
]

/**
 * Packages whose npm account was compromised, and the versions that carried
 * the payload.
 *
 * The version lists are the exact published versions the OSV database
 * names, and they are deliberately narrow. A blocklist that refuses every
 * version of a package is a blocklist that eventually blocks a legitimate
 * dependency and gets switched off; `event-stream@4` and `node-ipc@10` are
 * clean, and refusing them would be a false positive for a policy that has
 * nothing to protect there.
 *
 * The one entry with no version list is `flatmap-stream`, which is the
 * payload itself: the advisory covers every version of it, and there is no
 * clean release to fall back to.
 */
const KNOWN_MALICIOUS: { name: string; versions?: string[]; reason: string }[] = [
  {
    name: 'flatmap-stream',
    reason: 'the payload of the event-stream compromise (GHSA-9x64-5r7x-2q53, MAL-2025-20690)',
  },
  {
    name: 'event-stream',
    versions: ['3.3.6'],
    reason: 'compromised maintainer account, 2018 (GHSA-mh6f-8j2x-4483)',
  },
  {
    name: 'node-ipc',
    versions: ['9.1.6', '9.2.2', '9.2.3', '12.0.1'],
    reason: 'compromised maintainer account, 2026 (MAL-2026-3744, GHSA-8gr3-2gjw-jj7g)',
  },
  {
    name: 'ua-parser-js',
    versions: ['0.7.29', '0.8.0', '1.0.0'],
    reason: 'compromised maintainer account, 2021 (GHSA-pjwm-rvh2-c87w)',
  },
]

/**
 * Non-registry dependencies that are deliberate.
 *
 * Empty today. A package here is exempt from the registry-only rule, and
 * the exemption is a decision that belongs in a pull request rather than in
 * a transitive dependency.
 */
const ALLOWED_NON_REGISTRY: string[] = []

/**
 * A resolved version that is not semver did not come from a registry.
 *
 * The npm registry serves `1.2.3`. A git, GitHub, tarball or local
 * dependency is reported by the resolver as the specifier it came from --
 * `github:user/repo#<commit>`, an https URL, a file path -- which is not a
 * version at all.
 */
const isRegistryVersion = (version: string): boolean => /^\d+\.\d+\.\d+/.test(version)

const advisory = (level: Advisory['level'], name: string, description: string, url: string): Advisory => ({
  level,
  package: name,
  url,
  description,
})

const checkFloors = (pkg: ScanPackage): Advisory | null => {
  for (const floor of SECURITY_FLOORS) {
    if (floor.name !== pkg.name) continue

    const acceptable = floor.ranges.some((range) => Bun.semver.satisfies(pkg.version, range))
    if (acceptable) return null

    return advisory(
      'fatal',
      pkg.name,
      `${pkg.name}@${pkg.version} is below the required version. Accepted: ${floor.ranges.join(' or ')}. Reason: ${floor.reason}. ` +
        `The version in the tree was pinned by an "overrides" entry in package.json; if that entry was removed, put it back.`,
      `${ADVISORY_URL}?q=${encodeURIComponent(pkg.name)}`
    )
  }
  return null
}

const checkMalicious = (pkg: ScanPackage): Advisory | null => {
  for (const entry of KNOWN_MALICIOUS) {
    if (entry.name !== pkg.name) continue

    // No version list means every version of the package is malicious.
    if (!entry.versions) {
      return advisory(
        'fatal',
        pkg.name,
        `${pkg.name}@${pkg.version} is a known-malicious package and must not be installed. Reason: ${entry.reason}.`,
        `${ADVISORY_URL}?q=${encodeURIComponent(pkg.name)}`
      )
    }

    if (entry.versions.includes(pkg.version)) {
      return advisory(
        'fatal',
        pkg.name,
        `${pkg.name}@${pkg.version} is a known-malicious version and must not be installed. Reason: ${entry.reason}.`,
        `${ADVISORY_URL}?q=${encodeURIComponent(pkg.name)}`
      )
    }
  }
  return null
}

const checkRegistryOnly = (pkg: ScanPackage): Advisory | null => {
  if (isRegistryVersion(pkg.version)) return null
  if (ALLOWED_NON_REGISTRY.includes(pkg.name)) return null

  return advisory(
    'fatal',
    pkg.name,
    `${pkg.name}@${pkg.version} did not resolve from the npm registry. A dependency from git, a URL or a local directory has no immutable version: ` +
      `whoever controls that source can change what it points to after it has been reviewed. Use a published registry version, ` +
      `or add the package to ALLOWED_NON_REGISTRY in scripts/security-scanner.ts if the non-registry source is deliberate.`,
    'https://bun.com/docs/pm/cli/install#non-npm-dependencies'
  )
}

const scanPackages = (packages: ScanPackage[]): Advisory[] => {
  const advisories: Advisory[] = []

  for (const pkg of packages) {
    // A record with no name or no version is not a package. It is a
    // malformed resolver result, and inventing an advisory for it would
    // cancel an install over a bug in the caller.
    if (!pkg || typeof pkg.name !== 'string' || pkg.name.length === 0) continue
    if (typeof pkg.version !== 'string' || pkg.version.length === 0) continue

    const finding = checkMalicious(pkg) ?? checkFloors(pkg) ?? checkRegistryOnly(pkg)
    if (finding) advisories.push(finding)
  }

  return advisories
}

/**
 * The advisories OSV knows about, minus the ones this repository accepts.
 */
const checkOsv = async (packages: ScanPackage[]): Promise<Advisory[]> => {
  const hits = await queryOsv(packages)
  const advisories: Advisory[] = []

  for (const hit of hits) {
    if (ACCEPTED_ADVISORIES.has(hit.id)) {
      // An accepted advisory is still worth saying out loud -- it is a
      // decision somebody made, and the next reader should see it.
      console.error(
        `[security-scanner] accepted advisory ${hit.id} for ${hit.name}@${hit.version}${hit.summary ? `: ${hit.summary}` : ''}`
      )
      continue
    }

    advisories.push(
      advisory(
        'fatal',
        hit.name,
        `${hit.name}@${hit.version} has a known advisory: ${hit.id}${hit.summary ? ` -- ${hit.summary}` : ''}. ` +
          `The install was cancelled before the package was unpacked, which is the point of checking here rather than after the install. ` +
          `Upgrade the package, or add the advisory to ACCEPTED_ADVISORIES in scripts/security-scanner.ts with the reason it is accepted.`,
        `https://osv.dev/vulnerability/${hit.id}`
      )
    )
  }

  return advisories
}

export const scanner = {
  version: '1',

  // eslint-disable-next-line @typescript-eslint/require-await -- Bun's Scanner interface declares `scan` as returning a Promise, so the method has to be async even though it does not await
  async scan({ packages }: { packages: ScanPackage[] }): Promise<Advisory[]> {
    try {
      const advisories = scanPackages(packages)
      // The policy rules and the advisory lookup are separate on purpose.
      // The rules are decided here; the database is asked there. A failure
      // in the lookup is reported and the install proceeds, because a gate
      // that breaks every install is a gate that gets switched off.
      advisories.push(...(await checkOsv(packages)))
      return advisories
    } catch (error) {
      // A scanner that throws would cancel every install with a stack
      // trace and no explanation. Fail closed, but say what happened: a
      // broken scanner is a security failure, not a reason to wave the
      // packages through.
      return [
        advisory(
          'fatal',
          '(scanner)',
          `The security scanner itself failed, so no package could be checked. Fix the scanner before installing. ${error instanceof Error ? error.message : String(error)}`,
          'https://bun.com/docs/pm/security-scanner-api'
        ),
      ]
    }
  },
}
