import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { scanner, type Advisory, type ScanPackage } from '../security-scanner'

/**
 * The install-time security scanner is a gate: it cancels `bun install` when
 * it returns a fatal advisory. That cuts both ways, and both failures are
 * expensive.
 *
 * A false positive breaks every install on every machine, and the natural
 * response is to delete the scanner. A false negative lets a vulnerable or
 * malicious package in, and the natural response is to believe the scanner
 * is doing something.
 *
 * So both directions are tested here, against the same table the scanner
 * uses at runtime.
 */

const pkg = (name: string, version: string): ScanPackage => ({
  name,
  version,
  requestedRange: `^${version}`,
  tarball: `https://registry.npmjs.org/${name}/-/x.tgz`,
})

/**
 * The advisory lookup is a network call, and these tests must not make one.
 *
 * Without the stub, every assertion below would ask the live database about
 * the package it names -- and `proxy-addr@2.0.7` and `nanoid@4.0.0` really
 * do have advisories, so the counts would come back wrong. A test that
 * depends on the state of a remote database is not a test.
 */
const realFetch = globalThis.fetch

/**
 * A fetch stub that answers the OSV batch query.
 *
 * The stub has to return a Promise, but it does not need to be an `async`
 * function -- an `async` function with no `await` in it is exactly what
 * `require-await` is about, and the linter says so.
 */
const osvStub = (ids: string[] = []): typeof globalThis.fetch =>
  (() =>
    Promise.resolve(
      new Response(JSON.stringify({ results: ids.map((id) => ({ vulns: [{ id }] })) }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )) as unknown as typeof globalThis.fetch

beforeAll(() => {
  globalThis.fetch = osvStub()
})

afterAll(() => {
  globalThis.fetch = realFetch
})

const scan = async (packages: { name: string; version: string }[]): Promise<Advisory[]> =>
  await scanner.scan({
    packages: packages.map((p) => ({ ...pkg(p.name, p.version), requestedRange: '^' + p.version, tarball: '' })),
  })

describe('security scanner', () => {
  it('passes the versions the tree actually resolves to', async () => {
    // The real resolved set. Every one of these was checked against the OSV
    // database, so the scanner has to agree.
    const advisories = await scan([
      { name: 'dompurify', version: '3.4.17' },
      { name: 'undici', version: '8.12.2' },
      { name: 'lodash', version: '4.18.1' },
      { name: 'follow-redirects', version: '1.16.3' },
      { name: 'source-map-js', version: '1.2.2' },
      { name: 'fast-uri', version: '3.1.9' },
      { name: 'brace-expansion', version: '1.1.21' },
      { name: 'brace-expansion', version: '2.1.7' },
      { name: 'brace-expansion', version: '5.0.12' },
      { name: 'serialize-javascript', version: '7.1.2' },
      { name: 'proxy-addr', version: '2.0.8' },
      { name: 'compression', version: '1.8.2' },
      { name: 'ip-address', version: '10.7.4' },
      { name: 'js-yaml', version: '3.15.2' },
      { name: 'qs', version: '6.16.1' },
      { name: 'tmp', version: '0.2.7' },
      { name: 'uuid', version: '11.1.1' },
      { name: 'basic-ftp', version: '6.2.3' },
      { name: '@modelcontextprotocol/server', version: '2.3.1' },
      { name: 'nanoid', version: '3.3.18' },
    ])

    expect(advisories).toEqual([])
  })

  it('ignores packages it has no policy about', async () => {
    const advisories = await scan([
      { name: 'react', version: '19.2.8' },
      { name: 'next', version: '16.5.0-canary.20' },
      { name: 'typescript', version: '7.1.0-beta' },
      { name: 'tsrs', version: '0.18.0-ts7.1.0-dev.20260929' },
    ])

    expect(advisories).toEqual([])
  })

  it('rejects a version below a security floor', async () => {
    const advisories = await scan([{ name: 'proxy-addr', version: '2.0.7' }])

    expect(advisories).toHaveLength(1)
    expect(advisories[0].level).toBe('fatal')
    expect(advisories[0].package).toBe('proxy-addr')
  })

  it('rejects a release line that has no patched version', async () => {
    // uuid 12.x has no clean release: 12.0.1 is affected and 12.0.2 was
    // never published. A floor of ">=11.1.1" would have waved it through.
    const advisories = await scan([{ name: 'uuid', version: '12.0.1' }])

    expect(advisories).toHaveLength(1)
    expect(advisories[0].level).toBe('fatal')
  })

  it('rejects the nanoid 4.x line, which has no patched release', async () => {
    const advisories = await scan([{ name: 'nanoid', version: '4.0.0' }])

    expect(advisories).toHaveLength(1)
    expect(advisories[0].level).toBe('fatal')
  })

  it('scopes a floor to its own release line', async () => {
    // brace-expansion has three lines in the tree, each with its own fix.
    // A single floor of 5.0.12 would have flagged the 1.x and 2.x lines
    // that are perfectly clean.
    const advisories = await scan([
      { name: 'brace-expansion', version: '1.1.21' },
      { name: 'brace-expansion', version: '2.1.7' },
    ])

    expect(advisories).toEqual([])
  })

  it('rejects a known-malicious package at any version', async () => {
    // flatmap-stream is the payload itself: every published version of it
    // is malicious, so there is no clean release to allow.
    const advisories = await scan([{ name: 'flatmap-stream', version: '0.1.1' }])

    expect(advisories).toHaveLength(1)
    expect(advisories[0].level).toBe('fatal')
  })

  it('rejects a known-malicious version of a package that also has clean versions', async () => {
    const advisories = await scan([{ name: 'ua-parser-js', version: '1.0.0' }])

    expect(advisories).toHaveLength(1)
    expect(advisories[0].level).toBe('fatal')
  })

  it('allows a clean version of a package that has a malicious one', async () => {
    // The blocklist is deliberately narrow: event-stream 4 and node-ipc 10
    // were never compromised, and refusing them would be a false positive
    // for a policy that has nothing to protect there.
    const advisories = await scan([
      { name: 'ua-parser-js', version: '1.0.1' },
      { name: 'event-stream', version: '4.0.0' },
      { name: 'node-ipc', version: '10.1.3' },
    ])

    expect(advisories).toEqual([])
  })

  it('rejects every listed malicious version of node-ipc', async () => {
    for (const version of ['9.1.6', '9.2.2', '9.2.3', '12.0.1']) {
      const advisories = await scan([{ name: 'node-ipc', version }])
      expect(advisories, `node-ipc@${version} must be rejected`).toHaveLength(1)
    }
  })

  it('rejects a dependency that did not resolve from the registry', async () => {
    const advisories = await scan([{ name: 'some-lib', version: 'github:someone/some-lib#abc123' }])

    expect(advisories).toHaveLength(1)
    expect(advisories[0].level).toBe('fatal')
    expect(advisories[0].description).toContain('did not resolve from the npm registry')
  })

  describe('the advisory lookup', () => {
    /**
     * Make the database answer with the given vulnerabilities.
     */
    const withOsv = async (ids: string[], run: () => Promise<void>): Promise<void> => {
      globalThis.fetch = osvStub(ids)
      try {
        await run()
      } finally {
        globalThis.fetch = osvStub()
      }
    }

    it('cancels the install for an advisory it does not accept', async () => {
      await withOsv(['GHSA-test-not-accepted'], async () => {
        const advisories = await scan([{ name: 'some-package', version: '1.0.0' }])

        expect(advisories).toHaveLength(1)
        expect(advisories[0].level).toBe('fatal')
        expect(advisories[0].description).toContain('GHSA-test-not-accepted')
      })
    })

    it('accepts an advisory the repository has decided to live with', async () => {
      // The four the audit baseline ignores. One of them is enough to prove
      // the accepted path works.
      await withOsv(['GHSA-vfj7-8cjw-p6xm'], async () => {
        const advisories = await scan([{ name: 'braces', version: '3.0.3' }])

        expect(advisories).toEqual([])
      })
    })

    it('fails open when the database cannot be reached', async () => {
      // A gate that blocks every install on a network blip is a gate that
      // gets switched off.
      globalThis.fetch = (() => {
        throw new Error('network is down')
      }) as unknown as typeof globalThis.fetch

      try {
        const advisories = await scan([{ name: 'some-package', version: '1.0.0' }])
        expect(advisories).toEqual([])
      } finally {
        globalThis.fetch = osvStub()
      }
    })
  })

  it('reports every violation, not just the first', async () => {
    const advisories = await scan([
      { name: 'proxy-addr', version: '2.0.7' },
      { name: 'lodash', version: '4.17.21' },
      { name: 'flatmap-stream', version: '0.1.1' },
    ])

    expect(advisories).toHaveLength(3)
  })

  it('does not throw on a malformed package', async () => {
    const advisories = await scanner.scan({
      packages: [
        { name: undefined as unknown as string, version: '1.0.0', requestedRange: '', tarball: '' },
        { name: 'react', version: undefined as unknown as string, requestedRange: '', tarball: '' },
        { name: '', version: '', requestedRange: '', tarball: '' },
      ],
    })

    expect(advisories).toEqual([])
  })

  it('fails closed if the scan itself throws', async () => {
    // A scanner that throws would cancel every install with no explanation.
    // It has to fail closed, and say so.
    const advisories = await scanner.scan({ packages: null as unknown as ScanPackage[] })
    expect(advisories).toHaveLength(1)
    expect(advisories[0].level).toBe('fatal')
    expect(advisories[0].description).toContain('security scanner itself failed')
  })
})
