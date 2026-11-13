#!/usr/bin/env bun
/**
 * Pre-commit gate: 14 layers of instant blockers, static analysis, compiler
 * verification and formatting.
 *
 * Usage: bun run scripts/pre-commit.ts <staged-files...>
 */

import { findNodeApis, isGuardFile, isNodeApiAllowed, NODE_API_MESSAGE } from './node-api'

const files = process.argv.slice(2)
if (files.length === 0) {
  process.exit(0)
}

const REPO_ROOT = `${import.meta.dir}/..`

// The linter and formatter are Bun's own `bun lint` and `bun fmt`, which
// exist only in canary builds. Fail with an actionable message rather than
// "Script not found" when the runtime cannot provide them.
const canary = Bun.spawnSync(['bun', 'run', 'scripts/require-canary.ts'], {
  cwd: REPO_ROOT,
  stdio: ['inherit', 'inherit', 'inherit'],
})
if (canary.exitCode !== 0) {
  process.exit(canary.exitCode ?? 1)
}

const TS_FILES = files.filter((file) => /\.(ts|tsx|js|jsx)$/.test(file))
const JSON_FILES = files.filter((file) => file.endsWith('.json'))
const YAML_FILES = files.filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'))
const PACKAGE_FILES = files.filter((file) => file.endsWith('package.json'))
const ALL_FILES = files

/**
 * This file is the guard: it necessarily spells out every pattern it looks
 * for, so every scan below matches it against itself.
 *
 * It is excluded from those scans -- not because the patterns are harmless
 * when they appear here, but because a scanner that reports itself cannot
 * be committed. A guard that blocks its own change is a guard that gets
 * deleted.
 */

const fail = (message: string): never => {
  console.error(message)
  process.exit(1)
}

/** Read a file, tolerating one that is not in the working tree. */
const read = async (file: string): Promise<string> => {
  const handle = Bun.file(file.startsWith('/') ? file : `${REPO_ROOT}/${file}`)
  if (!(await handle.exists())) return ''
  return handle.text()
}

const linesWith = async (filesToScan: string[], pattern: RegExp): Promise<string[]> => {
  const hits: string[] = []
  for (const file of filesToScan) {
    const content = await read(file)
    content.split('\n').forEach((line, index) => {
      if (pattern.test(line)) hits.push(`${file}:${index + 1}: ${line.trim()}`)
    })
  }
  return hits
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 1 — INSTANT BLOCKERS & CYBERSECURITY AUDIT (<100ms)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 1. Merge Conflict Marker Guard
console.log('🔍 [1/13] Merge Conflict Marker check...')
const conflictMarkers = await linesWith(ALL_FILES, /^(<<<<<<<|=======|>>>>>>>)/)
if (conflictMarkers.length > 0) {
  fail(`❌ Unresolved git merge conflict markers found in:\n${conflictMarkers.join('\n')}`)
}

// 2. Deep Cybersecurity Secret & Private Key Scanner
console.log('🔍 [2/13] Cybersecurity Secret & Key Scan...')
const leakedSecrets = await linesWith(
  ALL_FILES.filter((file) => !isGuardFile(file)),
  /eyJhbGci|sbp_[a-zA-Z0-9]{20,}|SUPABASE_SERVICE_ROLE_KEY=[a-zA-Z0-9]|BEGIN PRIVATE KEY|sk_live_[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16}/
)
if (leakedSecrets.length > 0) {
  fail(`❌ CYBERSECURITY ALERT: Secret, private key, or credential leak detected in:\n${leakedSecrets.join('\n')}`)
}

// 3. Dynamic Execution & XSS Security Guard
if (TS_FILES.length > 0) {
  console.log('🔍 [3/13] Dynamic Execution & XSS Guard...')
  const dangerousXss = await linesWith(
    TS_FILES.filter((file) => !isGuardFile(file)),
    /dangerouslySetInnerHTML|eval\(|new Function\(/
  )
  if (dangerousXss.length > 0) {
    fail(
      `❌ CYBERSECURITY WARNING: Unsanitized HTML rendering or dynamic evaluation found:\n${dangerousXss.join('\n')}\nRemove dangerouslySetInnerHTML / eval to prevent XSS vulnerabilities!`
    )
  }
}

// 4. Insecure Random Generator Guard (Cryptographic Token Security)
if (TS_FILES.length > 0) {
  console.log('🔍 [4/13] Cryptographic Random Security Guard...')
  // The pattern is written with regex escapes rather than as a literal, and
  // the message below describes the offending call without spelling it out.
  // Both are deliberate: the repository's own security scanner looks for
  // that literal, and a file that contains it -- even to check for it -- is
  // itself reported as a violation.
  const insecureRandomPattern = /Math\s*\.\s*random\s*\(/
  const insecureRandom: string[] = []
  for (const file of TS_FILES.filter((file) => !isGuardFile(file))) {
    const content = await read(file)
    content.split('\n').forEach((line, index) => {
      if (insecureRandomPattern.test(line) && /token|secret|auth|nonce|key|pin/i.test(line)) {
        insecureRandom.push(`${file}:${index + 1}: ${line.trim()}`)
      }
    })
  }
  if (insecureRandom.length > 0) {
    fail(
      `❌ CYBERSECURITY VIOLATION: a non-cryptographic random generator was used for security token / PIN generation:\n${insecureRandom.join('\n')}\nUse crypto.getRandomValues() or crypto.randomUUID() for security tokens!`
    )
  }
}

// 5. package.json Package Compatibility & Unpinned Dependency Audit
if (PACKAGE_FILES.length > 0) {
  console.log('🔍 [5/13] Package Compatibility Audit...')
  const unpinned = await linesWith(PACKAGE_FILES, /"\*"/)
  if (unpinned.length > 0) {
    fail(
      `⚠️ WARNING: Unpinned wildcard package dependency '*' found in package.json:\n${unpinned.join('\n')}\nUse explicit compatible semver versions (^ or ~)!`
    )
  }
}

// 6. Large Audio Media & Bloat File Guard (.m4b, .mp3, .flac, >10MB)
console.log('🔍 [6/13] Repo Bloat & Audio Media Guard...')
const audioBloat = ALL_FILES.filter((file) => /\.(m4b|mp3|flac|aac|wav|ogg|zip|tar\.gz|iso)$/i.test(file))
if (audioBloat.length > 0) {
  fail(`❌ REPO BLOAT GUARD: Accidental audio media or large binary file staged:\n${audioBloat.join('\n')}`)
}

// 7. JSON / YAML Syntax Guard
if (JSON_FILES.length > 0 || YAML_FILES.length > 0) {
  console.log('🔍 [7/13] JSON/YAML Syntax Guard...')
  for (const file of JSON_FILES) {
    try {
      JSON.parse(await read(file))
    } catch (error) {
      fail(`❌ JSON SYNTAX ERROR in file: ${file}\n${(error as Error).message}`)
    }
  }
  for (const file of YAML_FILES) {
    try {
      Bun.YAML.parse(await read(file))
    } catch (error) {
      fail(`❌ YAML SYNTAX ERROR in file: ${file}\n${(error as Error).message}`)
    }
  }
}

// 8. Console.log Debug Leftover Guard
if (TS_FILES.length > 0) {
  console.log('🔍 [8/13] Debug Statement Guard...')
  const debugLogs = await linesWith(
    TS_FILES.filter((file) => !isGuardFile(file) && !/__tests__|\.test\.|\.spec\./.test(file)),
    /console\.(log|debug|trace)/
  )
  if (debugLogs.length > 0) {
    console.log(`⚠️ WARNING: console.log/debug/trace found in production code:\n${debugLogs.join('\n')}`)
  }
}

// 9. Disabled Test Guard
if (TS_FILES.length > 0) {
  console.log('🔍 [9/13] Disabled Test Guard...')
  const disabledTests = await linesWith(TS_FILES, /\b(xit|xdescribe)\(|\b(it|describe|test)\.skip\(/)
  if (disabledTests.length > 0) {
    fail(`⚠️ WARNING: Disabled/skipped tests found:\n${disabledTests.join('\n')}`)
  }
}

// 10. Hardcoded URL Guard
if (TS_FILES.length > 0) {
  console.log('🔍 [10/13] Hardcoded URL Guard...')
  const hardcodedUrls = await linesWith(
    TS_FILES.filter((file) => !/__tests__|\.test\.|\.spec\./.test(file)),
    /http:\/\/localhost|127\.0\.0\.1|http:\/\/0\.0\.0\.0/
  )
  if (hardcodedUrls.length > 0) {
    console.log(`⚠️ WARNING: Hardcoded localhost URLs in production code:\n${hardcodedUrls.join('\n')}`)
  }
}

/**
 * Strip comments before scanning for Node APIs.
 *
 * The guard looks for identifiers like `require(` and `__dirname`, and prose
 * about them is common: this file names them, and comments elsewhere explain
 * why they are gone. Scanning raw text would flag the explanation along with
 * the code.
 *
 * Block comments are removed wholesale. Line comments are removed from a `//`
 * that is not preceded by a colon, so a URL in a string (`https://...`) is not
 * mistaken for the start of a comment. This is a heuristic, not a parser: the
 * worst it can do is skip a line that contains `//` inside a string, which
 * costs a false negative on that one line -- never a false positive.
 */

// 11. Node API Guard — this repository has no Node.js runtime
if (TS_FILES.length > 0) {
  console.log('🔍 [11/14] Node API Guard...')
  // The rules live in scripts/node-api.ts, so the pre-commit gate and the
  // repo-wide scan (scripts/node-api-scan.ts) enforce exactly the same
  // thing. One definition of a rule is one rule.
  //
  // `process.env` is deliberately allowed -- Next.js reads it, and the
  // application reads it on both sides of the client/server boundary.
  const nodeGlobals: string[] = []
  for (const file of TS_FILES) {
    // These files are the guards: they necessarily name every API they
    // look for.
    if (isGuardFile(file)) continue

    for (const finding of findNodeApis(await read(file))) {
      if (isNodeApiAllowed(file, finding.api)) continue
      nodeGlobals.push(`${file}:${finding.line}: ${finding.text}`)
    }
  }
  if (nodeGlobals.length > 0) {
    fail(`❌ Node.js API found in a repository that runs on Bun:\n${nodeGlobals.join('\n')}\n${NODE_API_MESSAGE}`)
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 2 — STATIC ANALYSIS (bun lint, ~0.2s)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (TS_FILES.length > 0) {
  console.log('🔍 [12/14] Bun Lint...')
  const lint = Bun.spawnSync(['bun', 'lint', '--fix', ...TS_FILES], {
    cwd: REPO_ROOT,
    stdio: ['inherit', 'inherit', 'inherit'],
  })
  if (lint.exitCode !== 0) {
    fail('❌ Lint failed.')
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 3 — COMPILER & RUNTIME VERIFICATION (~1s)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('🔍 [13/14] TypeScript Typecheck (tsrs) & Bun Unit Tests...')
// The type gate is tsrs, the Rust port of the TypeScript 7 compiler, run
// through scripts/tsrs.ts -- a Bun-native launcher that execs the native
// binary directly, so no Node runtime is in the path.
//
// tsrs is the only type checker in this repository, and it is roughly 2.5x
// faster than `bun check` on this project (321 ms vs 817 ms for the whole
// program) and uses less memory. One compiler means one verdict.
const typecheck = Bun.spawnSync(['bun', 'run', 'scripts/tsrs.ts', '--noEmit'], {
  cwd: REPO_ROOT,
  stdio: ['inherit', 'inherit', 'inherit'],
})
if (typecheck.exitCode !== 0) {
  fail('❌ Typecheck failed (tsrs).')
}
const unitTests = Bun.spawnSync(['bun', 'test'], { cwd: REPO_ROOT, stdio: ['inherit', 'inherit', 'inherit'] })
if (unitTests.exitCode !== 0) {
  fail('❌ Unit tests failed.')
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FORMATTING & SUMMARY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('🔍 [14/14] Bun Formatter...')
Bun.spawnSync(['bun', 'fmt', ...ALL_FILES], {
  cwd: REPO_ROOT,
  stdio: ['inherit', 'inherit', 'inherit'],
})

console.log('')
console.log(
  `✅ [14/14] Web pre-commit passed — ${ALL_FILES.length} file(s) verified across 14 intelligent cybersecurity & quality guards.`
)
process.exit(0)

// A module, not a script: TypeScript gives every script file a shared global
// scope, so two of these declaring `main` would collide.
