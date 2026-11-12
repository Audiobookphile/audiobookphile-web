#!/usr/bin/env bun
/**
 * Unified pre-push delivery gate for audiobookphile-web.
 *
 * Runs checks in sequence so the first failure is the one you see.
 * e2e-library soft-skips when PLAYWRIGHT_* creds are absent.
 */

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

let failed = false

/**
 * Run one step, and say whether it passed.
 *
 * The return value is what lets the gate stop early: a step that has
 * decided that the rest of the run would be noise -- the host preflight --
 * needs to be able to end the run rather than be recorded and followed.
 */
const step = async (label: string, run: () => number | Promise<number>): Promise<boolean> => {
  console.log('')
  console.log(`━━━ ${label} ━━━`)
  const code = await run()
  if (code !== 0) {
    console.error(`❌ FAILED: ${label}`)
    failed = true
    return false
  }
  console.log(`✅ ${label}`)
  return true
}

const bun = (args: string[]): number => {
  const result = Bun.spawnSync(['bun', ...args], { cwd: REPO_ROOT, stdio: ['inherit', 'inherit', 'inherit'] })
  return result.exitCode ?? 0
}

/**
 * Run the unit suite with coverage and check it against the floor in
 * bunfig.toml.
 *
 * Bun's own `coverageThreshold` key does the same job, but it is broken in
 * Bun 1.4.3: it fails the run unconditionally, whatever value it is given.
 * So the report is parsed here instead. The text reporter's summary row is
 * "All files | <functions>% | <lines>% |".
 */
const unitTestsWithCoverage = async (): Promise<number> => {
  const result = Bun.spawnSync(['bun', 'test', '--coverage'], {
    cwd: REPO_ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  // Bun 1.4.3 prints the coverage report on stderr, not stdout.
  const report = `${result.stdout.toString()}${result.stderr.toString()}`
  process.stdout.write(report)

  if (result.exitCode !== 0) {
    return result.exitCode ?? 1
  }

  const config = await Bun.file(`${REPO_ROOT}/bunfig.toml`).text()
  const read = (key: string): number => {
    const match = config.match(new RegExp(`^${key}\\s*=\\s*([\\d.]+)`, 'm'))
    return match ? Number(match[1]) : 0
  }
  const floor = { lines: read('lines'), functions: read('functions') }

  const summary = report.match(/^All files\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)/m)
  if (!summary) {
    console.error('❌ Could not read the coverage summary from the test report.')
    return 1
  }

  const functions = Number(summary[1]) / 100
  const lines = Number(summary[2]) / 100

  if (functions < floor.functions || lines < floor.lines) {
    console.error(
      `❌ Coverage is below the floor: functions ${(functions * 100).toFixed(2)}% (need ${(floor.functions * 100).toFixed(0)}%), lines ${(lines * 100).toFixed(2)}% (need ${(floor.lines * 100).toFixed(0)}%).`
    )
    return 1
  }

  console.log(
    `   coverage: functions ${(functions * 100).toFixed(2)}% (floor ${(floor.functions * 100).toFixed(0)}%), lines ${(lines * 100).toFixed(2)}% (floor ${(floor.lines * 100).toFixed(0)}%)`
  )
  return 0
}

async function main(): Promise<void> {
  // The host, before anything expensive.
  //
  // Memory, swap, load and disk. A build that starts on a starved host
  // fails in a way that reads like a product regression -- the OOM killer
  // takes the dev server out, and every test then fails on a refused
  // connection. A full disk fails the same way: the build does not say "the
  // disk is full", it says something about a file it could not write.
  //
  // This is a preflight, so it is cheap and it is first -- and when it
  // fails, the run stops there. Everything after it would run slowly on a
  // host that has no room for it, and the results would be noise dressed
  // up as findings. The preflight says "refusing to start a build that
  // will be blamed on the product", and the gate has to actually refuse.
  const hostReady = await step('Host pressure', () => bun(['run', 'scripts/host-pressure.ts']))
  if (!hostReady) {
    console.error('')
    console.error('🚫 pre-push gate: stopped at the host preflight.')
    console.error('   Free the host, or run the gate when it has room.')
    process.exit(1)
  }

  // The type gate is tsrs, the Rust port of the TypeScript 7 compiler, run
  // through scripts/tsrs.ts -- a Bun-native launcher that execs the native
  // binary directly, so no Node runtime is in the path.
  //
  // tsrs is the only type checker in this repository, and it is roughly
  // 2.5x faster than `bun check` on this project (321 ms vs 817 ms for the
  // whole program) and uses less memory.
  //
  // One compiler means one verdict: "the build passed" and "the gate
  // passed" cannot mean different things. The second implementation of the
  // type system earns its keep in `bun lint`, whose type-aware rules need
  // types -- not in a second verdict that can fail a deploy on its own.
  await step('Typecheck (tsrs)', () => bun(['run', 'scripts/tsrs.ts', '--noEmit']))
  // The suite runs with --coverage so the coverage floor in bunfig.toml is
  // enforced here, at the delivery gate, rather than on every commit.
  await step('Unit tests', () => unitTestsWithCoverage())
  await step('Lint (errors only)', () => {
    const result = Bun.spawnSync(['bun', 'lint', '--format', 'unix', '--all'], {
      cwd: REPO_ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const output = `${result.stdout.toString()}${result.stderr.toString()}`
    const errors = output.split('\n').filter((line) => line.includes('[Error/'))
    if (errors.length > 0) {
      console.error(errors.slice(0, 40).join('\n'))
      return 1
    }
    return 0
  })
  // The Node API rules, over the whole tree.
  //
  // The pre-commit gate applies them to the files in a commit, which covers
  // the ordinary path. It does not cover a merge that brings in a file
  // written on another branch, a commit made with `--no-verify`, or a rule
  // that was tightened after the tree was already committed. This scan reads
  // every source file, every time.
  await step('Node API scan', () => bun(['run', 'scripts/node-api-scan.ts']))
  // The lint gate has to be linting.
  //
  // A lint run that reports nothing is indistinguishable from a lint run
  // with nothing to report, and a configuration change can silence the
  // whole rule set without any error. The canary lints a file with a
  // deliberate violation and requires the rule to fire.
  await step('Lint canary', () => bun(['run', 'scripts/lint-canary.ts']))
  // The lint debt may shrink, but it may not grow.
  //
  // The type-aware rules that are still deferred are switched off, so the
  // violations they carry are reported nowhere -- and a new one would join
  // them silently. The ratchet lints with each deferred rule switched on, in
  // turn, and fails if a rule has more violations than the baseline recorded
  // in bunfig.toml.
  await step('Lint debt ratchet', () => bun(['run', 'scripts/lint-debt.ts']))
  // The production dependency tree, checked against the advisory database.
  //
  // `bun audit --production` is the right scope here: the shipped image
  // contains `dependencies` and nothing else, so a dev-only advisory is not
  // something a user of this application can be affected by. The full
  // `bun run audit:all` runs in CI, where the dev tree matters more.
  await step('Dependency audit', () => bun(['run', 'audit']))
  // The install-time security scanner, run over the whole lockfile.
  //
  // `bun install` already runs the scanner, because bunfig.toml configures
  // it -- but the install-time scan only sees the packages being installed
  // for this platform. `bun pm scan` sees every package in the lockfile,
  // including the ones a different platform would install.
  await step('Dependency scan', () => bun(['pm', 'scan']))
  // The dependencies whose lifecycle scripts Bun refused to run.
  //
  // Bun blocks them by default, so nothing is at risk -- but a package that
  // wants to run code at install time is exactly what a supply-chain review
  // should look at, and the list grows silently. This step makes the
  // growth visible.
  await step('Lifecycle script audit', () => bun(['run', 'scripts/lifecycle-audit.ts']))
  await step('Security audit', () => bun(['run', 'scripts/security-audit.ts']))

  // The files a deployment needs, checked against .vercelignore.
  //
  // The build ends with the type gate, which is a script, and .vercelignore
  // excludes the scripts directory. A script the build needs and the ignore
  // file excludes is a build that works locally and fails on Vercel -- at
  // the last step, after the whole compile. This runs before the build so
  // that failure is a line of output rather than a red deploy.
  await step('Deploy file check', () => bun(['run', 'scripts/verify-deploy-files.ts']))

  // The production build, and the bundle budget it feeds.
  //
  // Everything above this line checks the source. None of it proves the
  // application *builds*, and the build is the artifact that ships -- on
  // Vercel and in the container image alike. Three failures live only in a
  // production build:
  //
  //   - A server component that imports a client-only value, or a client
  //     component that imports a server-only one. The dev server warns; the
  //     build refuses.
  //   - `output: 'standalone'` tracing, which fails on a dependency the
  //     tracer cannot follow.
  //   - Static generation and ISR, which run at build time and nowhere else.
  //
  // CI runs the build, so a break is found -- after the push, on the
  // deploy's clock. Catching it here turns a red deploy into a red gate.
  //
  // The build comes before the e2e on purpose. `bun run build` clears
  // `.next`, and the e2e starts a dev server; a dev server and a production
  // build do not share a directory, so the order is the one that leaves
  // both intact. The size budget runs in between, against the production
  // chunks, before the dev server has written anything next to them.
  await step('Production build', () => bun(['run', 'build']))
  await step('Bundle size budget', () => bun(['run', 'size']))

  // The build's output is not needed by anything after this, and the e2e
  // should not run next to it.
  //
  // Two reasons. The obvious one is disk: a production build leaves 363 MB
  // behind, and the e2e starts a dev server that writes its own output
  // beside it -- on a host that may not have the room, a dev server that
  // cannot write is a dev server that dies, and the run fails with a
  // refused connection that says nothing about the product.
  //
  // The subtler one is that `next dev` and `next build` do not share a
  // `.next` directory, and a dev server that starts next to a production
  // build's manifests is running against artifacts it did not make. The
  // e2e should test the tree, not the tree plus a build.
  await step('Clean the build output', () => bun(['run', 'clean']))

  await step('Library e2e resilience', () => bun(['run', 'scripts/e2e-library.ts']))

  console.log('')
  if (failed) {
    console.error('🚫 pre-push gate: FAILED — fix the steps above before pushing.')
    process.exit(1)
  }
  console.log('🚀 pre-push gate: all checks green.')
  process.exit(0)
}

main().catch((error: unknown) => {
  console.error('pre-push gate failed:', error)
  process.exit(1)
})

// A module, not a script: TypeScript gives every script file a shared global
// scope, so two of these declaring `main` would collide.
export {}
