#!/usr/bin/env bun
/**
 * Proves the lint gate is actually linting.
 *
 * A gate that reports nothing looks exactly like a gate with nothing to
 * report. That is not a theoretical worry in this repository: adding a
 * `[[lint.overrides]]` block to `bunfig.toml` silently disabled the *entire*
 * lint configuration in Bun 1.4.4-canary.1 -- not just the rules the
 * override named, and not just for the files it matched. 1359 reported
 * problems became 0, and the pre-push gate passed, because it checks for
 * errors and there were none.
 *
 * Nothing in the output distinguishes "the rules are on and the code is
 * clean" from "the rules are not running". This is the thing that tells
 * them apart.
 *
 * It writes a file with a deliberate violation of a rule the repository
 * enables, lints it, and requires the rule to fire. The violation is
 * `await 42`, which is an `await` on a non-promise -- a mistake the
 * type-aware `await-thenable` rule exists to catch, so the canary also
 * proves that the type-aware machinery is running and not just the
 * syntactic rules.
 */

const REPO_ROOT = `${import.meta.dir}/..`

// The probe lives in the repository root so that it is inside the
// tsconfig's include: a type-aware rule needs type information, and a file
// outside the project gets none.
const PROBE = `${REPO_ROOT}/lint-canary.probe.ts`

// The rule the canary expects to fire. It is enabled as an error in
// bunfig.toml, so a canary that stays quiet means the configuration is not
// being applied.
const EXPECTED_RULE = '@typescript-eslint/await-thenable'

const PROBE_SOURCE = `// Written by scripts/lint-canary.ts. Deleted when the check finishes.
// The line below is a deliberate violation: awaiting a non-promise.
export async function canary(): Promise<void> {
  await 42
}
`

const cleanup = (): void => {
  Bun.spawnSync(['rm', '-f', PROBE], { stdout: 'ignore', stderr: 'ignore' })
}

async function main(): Promise<void> {
  await Bun.write(PROBE, PROBE_SOURCE)

  let output: string
  try {
    const result = Bun.spawnSync(['bun', 'lint', '--format', 'unix', 'lint-canary.probe.ts'], {
      cwd: REPO_ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    })
    output = `${result.stdout.toString()}${result.stderr.toString()}`
  } finally {
    cleanup()
  }

  if (output.includes(EXPECTED_RULE)) {
    console.log(`✅ The lint rules are applied: ${EXPECTED_RULE} fired on the canary.`)
    process.exit(0)
  }

  console.error(
    `❌ The lint rules are not being applied.\n` +
      `   The canary file has a deliberate \`await\` of a non-promise, and\n` +
      `   ${EXPECTED_RULE} did not report it.\n\n` +
      `   A lint run that reports nothing is indistinguishable from a lint run with\n` +
      `   nothing to report, so this check exists to tell them apart. The usual\n` +
      `   cause in this Bun version is a \`[[lint.overrides]]\` block in bunfig.toml,\n` +
      `   which disables the whole configuration rather than the rules it names.\n\n` +
      `   Lint output was:\n${output.trim() || '(nothing)'}`
  )
  process.exit(1)
}

main().catch((error: unknown) => {
  cleanup()
  console.error('lint canary failed:', error)
  process.exit(1)
})
