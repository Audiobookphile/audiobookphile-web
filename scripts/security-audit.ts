#!/usr/bin/env bun
/**
 * Web security and package audit.
 *
 * Scans the source tree for hardcoded secrets, dynamic code execution,
 * unsanitized HTML rendering, insecure randomness and unpinned dependencies.
 *
 * If the `audiobookphile` CLI is available it is used instead -- it carries
 * the canonical rules for this project.
 */

const REPO_ROOT = `${import.meta.dir}/..`
const CLI_BIN = `${REPO_ROOT}/../audiobookphile-backend/crates/cli/target/release/audiobookphile`

const fail = (message: string): never => {
  console.error(message)
  process.exit(1)
}

const APPROVED_DANGEROUS_HTML = ['ExpandableHtml', 'ViewEpisodeModal', 'EpisodeRow', 'SlateEditorExamples']

/**
 * Where the scan looks.
 *
 * The whole repository, minus the generated trees and the artifacts. The
 * extension lists are deliberate: an `.env` file has no extension, so it is
 * never picked up, and the env files are where a service-role key is
 * *supposed* to be -- they are gitignored, and a scan that flagged them
 * would be flagging the developer's own machine.
 */
const SCAN_GLOBS = [
  'src/**/*.{ts,tsx,js,jsx,mjs,cjs}',
  'scripts/**/*.{ts,tsx,js,jsx,mjs,cjs}',
  'tests/**/*.{ts,tsx,js,jsx,mjs,cjs}',
  'docs/**/*.{ts,tsx,js,jsx,mjs,cjs}',
  '*.{ts,tsx,js,jsx,mjs,cjs}',
  '*.{json,toml,yml,yaml,properties}',
  '.github/workflows/*.{yml,yaml}',
]

/**
 * The generated trees and the artifacts. None of them is source, and a
 * build output is a copy of the source that has already been scanned.
 */
const IGNORED_DIRECTORIES = [
  'node_modules',
  '.next',
  'out',
  'build',
  'coverage',
  'playwright-report',
  'test-results',
  '.lighthouseci',
  'public',
  'scratch',
]

/**
 * The files that spell out the patterns they look for.
 *
 * A scanner that reports itself cannot be committed, and a scanner that
 * gets deleted protects nothing.
 */
const PATTERN_FILES = ['scripts/security-audit.ts', 'scripts/pre-commit.ts']

async function main(): Promise<void> {
  console.log('🔒 Running Web Security & Package Audit...')

  // The CLI, when it is built, is the authority on these rules.
  const cli = Bun.which('audiobookphile') ?? ((await Bun.file(CLI_BIN).exists()) ? CLI_BIN : null)
  if (cli) {
    const result = Bun.spawnSync([cli, 'audit', '--path', REPO_ROOT, '--strict'], {
      cwd: REPO_ROOT,
      stdio: ['inherit', 'inherit', 'inherit'],
    })
    process.exit(result.exitCode ?? 0)
  }

  // Every source file in the repository, not just the ones under `src/`.
  //
  // A key committed in a script, a test or a config file is just as leaked
  // as one in a component, and the pre-commit gate only ever sees the files
  // in a commit -- so a secret that arrived through a merge would never be
  // looked at by anything. This scan reads the whole tree, every time.
  const sourceFiles: string[] = []
  for (const glob of SCAN_GLOBS) {
    for await (const file of new Bun.Glob(glob).scan({ cwd: REPO_ROOT, onlyFiles: true })) {
      if (IGNORED_DIRECTORIES.some((dir) => file === dir || file.startsWith(`${dir}/`))) continue
      if (PATTERN_FILES.includes(file)) continue
      sourceFiles.push(file)
    }
  }
  sourceFiles.sort()

  const contents = await Promise.all(
    sourceFiles.map(async (file) => ({ file, lines: (await Bun.file(`${REPO_ROOT}/${file}`).text()).split('\n') }))
  )

  // 1. Secret & key scan
  const FORBIDDEN_PATTERNS =
    /eyJhbGci|sbp_[a-zA-Z0-9]{20,}|SUPABASE_SERVICE_ROLE_KEY=[a-zA-Z0-9]|BEGIN PRIVATE KEY|sk_live_[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16}/

  const leaks: string[] = []
  // 2. Dynamic execution & XSS
  const dynamicEval: string[] = []
  const dangerousXss: string[] = []
  // 3. Cryptographic token security
  const mathRandom: string[] = []

  for (const { file, lines } of contents) {
    const source = lines.join('\n')
    lines.forEach((line, index) => {
      const where = `${file}:${index + 1}: ${line.trim()}`
      if (FORBIDDEN_PATTERNS.test(line)) leaks.push(where)
      if (/eval\(|new Function\(/.test(line)) dynamicEval.push(where)
      if (
        line.includes('dangerouslySetInnerHTML') &&
        !APPROVED_DANGEROUS_HTML.some((component) => source.includes(component))
      ) {
        dangerousXss.push(where)
      }
      if (/Math\.random\(|Double\.random\(/.test(line)) mathRandom.push(where)
    })
  }

  if (leaks.length > 0) {
    fail(`❌ SECURITY AUDIT FAILED: Hardcoded secret/key leak detected:\n${leaks.join('\n')}`)
  }
  if (dynamicEval.length > 0) {
    fail(`❌ SECURITY AUDIT FAILED: Dynamic code execution (eval / new Function) found:\n${dynamicEval.join('\n')}`)
  }
  if (dangerousXss.length > 0) {
    fail(
      `⚠️ SECURITY AUDIT WARNING: Unsanitized HTML rendering found outside approved widget components:\n${dangerousXss.join('\n')}`
    )
  }
  if (mathRandom.length > 0) {
    fail(
      `❌ SECURITY AUDIT FAILED: Insecure random number generator found (use crypto.randomUUID or crypto.getRandomValues):\n${mathRandom.join('\n')}`
    )
  }

  // 4. Unpinned wildcard package audit
  const packageJson = await Bun.file(`${REPO_ROOT}/package.json`).text()
  if (/"\*"/.test(packageJson)) {
    fail("⚠️ PACKAGE AUDIT WARNING: Unpinned wildcard package dependency '*' found in package.json")
  }

  console.log('✅ Web Security & Package Audit Passed Cleanly!')
  process.exit(0)
}

main().catch((error: unknown) => {
  console.error('security audit failed:', error)
  process.exit(1)
})

// A module, not a script: TypeScript gives every script file a shared global
// scope, so two of these declaring `main` would collide.
export {}
