/**
 * `prepare` lifecycle hook, executed by `bun install`.
 *
 * Replaces the previous `node -e "..."` one-liner: the repository runs on Bun
 * end to end, so the hook installer is a Bun script too.
 *
 * Git hooks are installed with lefthook. Two deliberate deviations from the
 * old behaviour:
 *
 *  1. CI is skipped. The old hook read `process.env.CI` and did nothing when
 *     it was set; same rule, expressed without Node.
 *  2. A checkout without git metadata is not an error. `bun install` runs
 *     `prepare` unconditionally, and a source archive (or a CI job that
 *     exports the tree) has nowhere to install hooks. Failing there broke
 *     `bun install` for a reason that has nothing to do with the code. A real
 *     git checkout still fails loudly if lefthook itself breaks.
 */
const repoRoot = `${import.meta.dir}/..`

if (process.env.CI) {
  process.exit(0)
}

// `git rev-parse --git-dir` is the authoritative check: it succeeds inside a
// worktree or a submodule, where `.git` is a file rather than a directory.
const inGitRepo = Bun.spawnSync(['git', 'rev-parse', '--git-dir'], {
  cwd: repoRoot,
  stdout: 'ignore',
  stderr: 'ignore',
}).success

if (!inGitRepo) {
  console.log('⏭️  Not a git checkout — skipping lefthook install.')
  process.exit(0)
}

const result = Bun.spawnSync([`${repoRoot}/node_modules/.bin/lefthook`, 'install'], {
  cwd: repoRoot,
  stdio: ['inherit', 'inherit', 'inherit'],
})

if (!result.success) {
  console.error(`❌ lefthook install failed (exit code ${result.exitCode}).`)
  process.exit(result.exitCode ?? 1)
}
