#!/usr/bin/env bun
/**
 * Point lefthook at `main` and open a pull request for it.
 *
 * A one-off helper for renaming the branch lefthook installs its hooks
 * against. It used to be a bash script; it is a Bun module now, like every
 * other script in this directory.
 *
 * Usage: bun run scripts/fix-lefthook.ts [target-branch]
 */

const BRANCH = process.argv[2] ?? 'main'
const LEFTHOOK = 'lefthook.yml'
const REPO_ROOT = `${import.meta.dir}/..`

const run = (cmd: string[], capture = false): { code: number; output: string } => {
  const result = Bun.spawnSync(cmd, {
    cwd: REPO_ROOT,
    stdout: capture ? 'pipe' : 'inherit',
    stderr: capture ? 'pipe' : 'inherit',
  })
  return {
    code: result.exitCode ?? 0,
    output: capture ? `${result.stdout?.toString() ?? ''}${result.stderr?.toString() ?? ''}` : '',
  }
}

const config = await Bun.file(`${REPO_ROOT}/${LEFTHOOK}`).text()
const updated = config.replaceAll(/master/g, BRANCH)

if (updated === config) {
  console.log(`ℹ️  ${LEFTHOOK} already targets "${BRANCH}" — nothing to change.`)
  process.exit(0)
}

await Bun.write(`${REPO_ROOT}/${LEFTHOOK}`, updated)
console.log(`✅ ${LEFTHOOK} now targets "${BRANCH}".`)

run(['git', 'add', LEFTHOOK])
run(['git', 'commit', '-m', `fix(ci): update lefthook target branch to ${BRANCH}`])
run(['git', 'push', 'origin', 'chore/ci-automation'])

const pr = run(
  [
    'gh',
    'pr',
    'create',
    '--title',
    'chore(ci): setup dependabot and auto-merge automation',
    '--body',
    'Sets up Dependabot updates for GitHub Actions and Bun, alongside an auto-approve and auto-merge workflow for dependabot PRs to provide a highly pro-active auto-updating ecosystem.',
  ],
  true
)

console.log(pr.output.trim())
process.exit(pr.code)
