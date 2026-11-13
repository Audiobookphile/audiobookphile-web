#!/usr/bin/env bun
/**
 * Repo-wide scan for Node.js APIs.
 *
 * The pre-commit gate applies the Node API rules to the files in a commit.
 * That covers the ordinary path -- a developer writes a `require()`, stages
 * it, and the commit is blocked.
 *
 * It does not cover the paths that skip staging:
 *
 *   * a merge brings in a file that was written on another branch;
 *   * a file is added with `git add` after the hook was installed, or the
 *     hook was skipped with `--no-verify`;
 *   * a rule is tightened in `scripts/node-api.ts` and the tree that does
 *     not satisfy it is already committed.
 *
 * The third one is the one that bites. A guard that only ever sees new
 * files cannot tell you that the repository is already violating a rule it
 * now enforces. This scan can: it reads the whole tree, every time, and it
 * uses the same rules as the pre-commit gate.
 *
 * The rules themselves live in `scripts/node-api.ts`, so there is one
 * definition of what a Node API is.
 */

import { findNodeApis, isGuardFile, isNodeApiAllowed, NODE_API_MESSAGE } from './node-api'

const REPO_ROOT = `${import.meta.dir}/..`

/**
 * The directories and files worth scanning.
 *
 * `node_modules` and the build output are skipped: they are not this
 * repository's code, and the build output is a copy of it.
 */
const SCAN_GLOBS = ['src/**/*.{ts,tsx,js,jsx,mjs,cjs}', 'scripts/**/*.ts', 'tests/**/*.ts', '*.{ts,tsx,js,mjs}']

const IGNORED_DIRECTORIES = ['node_modules', '.next', 'out', 'build', 'playwright-report', 'test-results', 'coverage']

/**
 * A file is worth scanning when it is source in this repository and not a
 * build artifact, a report, or a vendored dependency.
 */
const shouldScan = (path: string): boolean => {
  const relative = path.startsWith(`${REPO_ROOT}/`) ? path.slice(REPO_ROOT.length + 1) : path
  if (IGNORED_DIRECTORIES.some((dir) => relative.startsWith(`${dir}/`))) return false
  return /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(relative)
}

async function main(): Promise<void> {
  const files = new Set<string>()

  for (const glob of SCAN_GLOBS) {
    for await (const file of new Bun.Glob(glob).scan({ cwd: REPO_ROOT, onlyFiles: true })) {
      const path = `${REPO_ROOT}/${file}`
      if (shouldScan(path)) files.add(path)
    }
  }

  const findings: string[] = []
  let scanned = 0

  for (const path of [...files].sort()) {
    const relative = path.startsWith(`${REPO_ROOT}/`) ? path.slice(REPO_ROOT.length + 1) : path
    if (isGuardFile(relative)) continue

    const content = await Bun.file(path).text()
    scanned++

    for (const finding of findNodeApis(content)) {
      if (isNodeApiAllowed(relative, finding.api)) continue
      findings.push(`${relative}:${finding.line}: ${finding.text}`)
    }
  }

  if (findings.length > 0) {
    console.error(`❌ Node.js API found in a repository that runs on Bun:\n${findings.join('\n')}\n${NODE_API_MESSAGE}`)
    process.exit(1)
  }

  console.log(`✅ No Node.js APIs in ${scanned} source files.`)
  process.exit(0)
}

main().catch((error: unknown) => {
  console.error('node API scan failed:', error)
  process.exit(1)
})

// A module, not a script: TypeScript gives every script file a shared global
// scope, so two of these declaring `main` would collide.
