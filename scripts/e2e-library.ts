#!/usr/bin/env bun
/**
 * Pre-push / CI gate for library + entity e2e resilience tests.
 * Admin credentials are required because the suite verifies the admin edit flow.
 */

import { loadEnv } from './load-env'
import { countConnectionRefused, countServerErrors, isServerListening, shouldRetryOnFreshServer } from './e2e-signals'
import { memFreePct, rssOfMatching, swapFreePct } from './host-pressure'

const REPO_ROOT = `${import.meta.dir}/..`

/**
 * A port nothing is listening on.
 *
 * The gate picks one for itself rather than using a fixed port, because a
 * fixed port is a port a previous run can still be holding -- and a server
 * the gate did not start is a server the gate must not test against.
 *
 * The port is taken by binding one and releasing it, which is the only way
 * to ask the operating system for a free one.
 */
const findFreePort = async (): Promise<string> => {
  const server = Bun.serve({
    port: 0,
    fetch: () => new Response('ok'),
  })
  const { port } = server
  void server.stop(true)
  return String(port)
}

/**
 * Whether a path is a directory.
 *
 * `Bun.file(path).exists()` answers false for a directory -- it asks about
 * the file, and a directory is not one -- so the mode has to be read
 * instead. S_IFDIR is the directory bit of the mode.
 */
const isDirectory = async (path: string): Promise<boolean> => {
  try {
    const stat = await Bun.file(path).stat()
    return (stat.mode & 0o170000) === 0o040000
  } catch {
    return false
  }
}

/**
 * Whether anything is listening on a port.
 *
 * `lsof -ti` prints the process ids holding the port, and exits non-zero
 * when there are none. The e2e port is not touched with a signal: that
 * pattern also matches a developer's own dev server, and a gate must never
 * take out unrelated local work.
 */
const isPortFree = (port: string): boolean =>
  Bun.spawnSync(['lsof', '-ti', `:${port}`], { stdout: 'ignore', stderr: 'ignore' }).exitCode !== 0

/**
 * The worst the host looked while the suite ran.
 *
 * The reading that matters is the one from *during* the run. A snapshot
 * taken after a failure is taken after the dev server has died, and a dead
 * process has already given its memory back -- so the snapshot says the
 * host was fine at the moment the host was not. This keeps the lowest
 * free-memory reading and the largest dev-server footprint instead.
 */
interface HostPeak {
  memFreePct: number
  swapFreePct: number
  devServerMb: number
}

/**
 * Watches the host while the suite runs.
 *
 * The dev server is the process that dies, so it is followed by name: the
 * resident memory of everything whose command line mentions this
 * repository is the dev server's, and its high-water mark is what the
 * OOM killer had to fight.
 */
const startHostWatch = (): { stop: () => HostPeak } => {
  const peak: HostPeak = { memFreePct: Number.POSITIVE_INFINITY, swapFreePct: Number.POSITIVE_INFINITY, devServerMb: 0 }

  const sample = async (): Promise<void> => {
    const memory = Number(await memFreePct())
    const swap = Number(await swapFreePct())
    const devServer = rssOfMatching(REPO_ROOT)

    if (!Number.isNaN(memory)) peak.memFreePct = Math.min(peak.memFreePct, memory)
    if (!Number.isNaN(swap)) peak.swapFreePct = Math.min(peak.swapFreePct, swap)
    peak.devServerMb = Math.max(peak.devServerMb, devServer)
  }

  // The first sample is taken immediately, so a host that is already
  // starved is reported even when the suite fails in the first second.
  void sample()
  const timer = setInterval(() => void sample(), 5_000)

  return {
    stop: () => {
      clearInterval(timer)
      return peak
    },
  }
}

/**
 * Playwright owns the dev server for this run and tears it down on exit. If it
 * is killed mid-write, next dev leaves a truncated .next/dev/types/*.d.ts behind,
 * and next-env.d.ts imports those files directly — so the very next
 * `bun run typecheck` fails on syntax errors that have nothing to do with the
 * source tree. Drop the generated dev types so the gate leaves a clean tree.
 */
const cleanupDevTypes = async (): Promise<void> => {
  // The dev server is still flushing `.next/dev` as it dies, so a bare remove
  // can fail with "Directory not empty" and, worse, leave a truncated types
  // file behind. Removing a path that keeps being repopulated needs
  // persistence, not luck -- so retry, then empty it bottom-up, which cannot
  // lose the race the way a single remove of a mutating directory can.
  //
  // `rm -rf` and `find -delete` stay: Bun has no recursive remove, and the
  // bottom-up empty is what wins the race against a directory that is being
  // written to while it is removed.
  const dir = `${REPO_ROOT}/.next/dev`
  for (let attempt = 0; attempt < 10; attempt++) {
    const result = Bun.spawnSync(['rm', '-rf', dir], { cwd: REPO_ROOT, stdout: 'ignore', stderr: 'ignore' })
    if (result.exitCode === 0 && !(await isDirectory(dir))) {
      return
    }
  }
  Bun.spawnSync(['find', dir, '-depth', '-delete'], { cwd: REPO_ROOT, stdout: 'ignore', stderr: 'ignore' })
}

process.on('exit', () => {
  // Synchronous best-effort cleanup: the process is already dying, and an
  // exit handler cannot await.
  Bun.spawnSync(['rm', '-rf', `${REPO_ROOT}/.next/dev`], { cwd: REPO_ROOT, stdout: 'ignore', stderr: 'ignore' })
})

async function main(): Promise<void> {
  // Clear the dev types a previous run left behind before anything reads
  // them.
  //
  // The exit handler below cleans up after a run that finishes. It cannot
  // run for a run that was killed, and a killed `next dev` leaves a
  // truncated .next/dev/types/*.d.ts behind -- which next-env.d.ts imports
  // directly, so the *next* `bun run typecheck` fails on syntax errors that
  // have nothing to do with the source tree. The pre-push gate type checks
  // before it reaches this step, so the mess has to be cleared by whatever
  // ran before it, not by this script.
  await cleanupDevTypes()

  // Load .env.local / .env so the Playwright workers inherit them. `bun x`
  // does not load env files for the process it starts, so this has to be
  // explicit -- and the same loader the e2e fixtures use, so there is one
  // implementation of the precedence rules.
  await loadEnv(REPO_ROOT)

  // playwright.config reuses whatever already answers on the target URL
  // (reuseExistingServer), so a localhost target can silently bind this gate to
  // an unrelated dev server on :3000 — every route then 404s and the run dies in
  // fixture setup. Pin local runs to a dedicated port. Remote targets (CI preview
  // deployments) are left untouched.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  let e2ePort = ''
  if (siteUrl === '' || siteUrl.includes('localhost') || siteUrl.includes('127.0.0.1')) {
    e2ePort = process.env.E2E_PORT ?? (await findFreePort())
    process.env.NEXT_PUBLIC_SITE_URL = `http://localhost:${e2ePort}`
    process.env.PORT = e2ePort
    // The gate must never reuse a server it did not start.
    //
    // Playwright's `reuseExistingServer` is on by default, which is right
    // for a developer who wants to test against a dev server they are
    // already running -- and wrong for a gate. When something is already
    // listening on the port, Playwright skips starting a server at all and
    // the specs are pointed at whatever is there. When that something is a
    // leftover from a previous run, every test fails at the first
    // `page.goto('/login')` with ERR_CONNECTION_REFUSED, and the log shows no
    // server output at all -- because no server was started.
    process.env.E2E_REUSE_SERVER = '0'
    console.log(`🔒 Local e2e pinned to port ${e2ePort} (override with E2E_PORT).`)
  }

  // The dev server used to run under Node, where a V8 heap cap
  // (NODE_OPTIONS=--max-old-space-size) kept Next's dev server from growing
  // until the OS started swapping and the OOM killer took the server out
  // mid-run. That failure surfaced as `ERR_CONNECTION_REFUSED on /login` -- a red
  // run that says nothing about the product.
  //
  // That cap no longer applies: the dev server runs on Bun, whose runtime is
  // JavaScriptCore, and there is no V8-style heap ceiling to set. Bun collects
  // on its own terms instead of growing to a configured limit.
  //
  // The guard against a starved host is now scripts/host-pressure.ts, which runs
  // before the expensive work starts and names the memory hog instead of
  // surfacing later as a mystery.

  // Keep the browser binaries OUT of ~/Library/Caches.
  //
  // macOS periodically reaps ~/Library/Caches (com.apple.cache_delete), and it
  // reaped the Playwright browser mid-gate twice here: every test in the run died
  // with "browserType.launch: Executable doesn't exist", which looks exactly like
  // a broken test environment and tells you nothing about the product.
  // ~/.cache is not reaped, survives `node_modules` being rebuilt, and is the
  // XDG-standard location, so it is the durable home for the browsers.
  //
  // A user who has set PLAYWRIGHT_BROWSERS_PATH knows where they want the
  // browsers, and that wins.
  const browsersPath =
    process.env.PLAYWRIGHT_BROWSERS_PATH ??
    `${process.env.XDG_CACHE_HOME ?? `${process.env.HOME}/.cache`}/ms-playwright`
  process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath

  /**
   * Whether the browser this run needs is actually in the cache directory.
   *
   * The check is for the *exact directories* Playwright wants, not for "any
   * chromium-something". A cache that holds only a stale revision satisfies
   * the looser check, the install is skipped, and every test in the run dies
   * with "Executable doesn't exist" -- because the revision on disk is not
   * the revision the test runner launches.
   *
   * Asking Playwright is the only way to know the revision: it is the
   * package's own decision, and it changes with every Playwright upgrade.
   */
  const wantedBrowserDirs = async (dir: string): Promise<string[]> => {
    const result = Bun.spawnSync(['bun', 'x', '--bun', 'playwright', 'install', 'chromium', '--dry-run'], {
      cwd: REPO_ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
      // The dry run has to report the directory being asked about, not the
      // one PLAYWRIGHT_BROWSERS_PATH already points at -- otherwise the
      // answer would be the empty directory and the check would always fail.
      env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: dir },
    })

    const output = `${result.stdout.toString()}${result.stderr.toString()}`
    const wanted: string[] = []

    for (const line of output.split('\n')) {
      const match = line.match(/^\s*Install location:\s*(\S+)\s*$/)
      if (match?.[1]) wanted.push(match[1])
    }

    return wanted
  }

  /**
   * Playwright's own default browser directory for this platform.
   *
   * The same rule Playwright uses, so the two agree: ~/Library/Caches on
   * macOS, the XDG cache on Linux, %LOCALAPPDATA% on Windows.
   */
  const playwrightDefaultPath = (): string => {
    const home = process.env.HOME ?? ''
    if (process.platform === 'darwin') return `${home}/Library/Caches/ms-playwright`
    if (process.platform === 'win32') {
      return `${process.env.LOCALAPPDATA ?? `${home}/AppData/Local`}/ms-playwright`
    }
    return `${process.env.XDG_CACHE_HOME ?? `${home}/.cache`}/ms-playwright`
  }

  /**
   * Whether every browser directory Playwright wants is present in `dir`.
   */
  const browsersPresent = async (dir: string): Promise<boolean> => {
    if (!(await isDirectory(dir))) return false

    const wanted = await wantedBrowserDirs(dir)
    if (wanted.length === 0) return false

    const present = new Set<string>()
    for await (const entry of new Bun.Glob('*').scan({ cwd: dir, onlyFiles: false })) {
      if (entry) present.add(entry)
    }

    return wanted.every((path) => present.has(path.slice(path.lastIndexOf('/') + 1)))
  }

  let chromiumInstalled = await browsersPresent(browsersPath)

  if (!chromiumInstalled) {
    // Self-heal before reaching for the network.
    //
    // The durable directory does not have the browser, and the most likely
    // reason is that something reaped it or a previous install failed.
    // Playwright's own default directory is the other place the browser can
    // be, and when it is there the answer is a copy -- seconds, rather than
    // the minutes a 500 MB download takes.
    //
    // Only the directories Playwright actually wants are copied. A cache can
    // hold several revisions, and copying all of them would move a gigabyte
    // to save a download of half of it.
    //
    // `cp` is used rather than a Bun file copy because the browser binary
    // has to keep its executable bit, and a plain file write does not carry
    // the mode across.
    const fallback = playwrightDefaultPath()
    if (fallback !== browsersPath) {
      const wanted = await wantedBrowserDirs(fallback)
      const entries = wanted
        .filter((dir) => dir.startsWith(`${fallback}/`))
        .map((dir) => dir.slice(fallback.length + 1))
        .filter((entry) => entry.length > 0)

      if (entries.length > 0) {
        console.log(`♻️  Copying the Playwright browser from ${fallback} into ${browsersPath}...`)
        Bun.spawnSync(['mkdir', '-p', browsersPath], { stdout: 'ignore', stderr: 'ignore' })
        for (const entry of entries) {
          Bun.spawnSync(['cp', '-R', `${fallback}/${entry}`, browsersPath], { stdout: 'ignore', stderr: 'ignore' })
        }
        chromiumInstalled = await browsersPresent(browsersPath)
      }
    }
  }

  if (!chromiumInstalled) {
    console.log(`⬇️ Installing Playwright browsers into ${browsersPath} (one-time)...`)
    const install = Bun.spawnSync(['bun', 'x', '--bun', 'playwright', 'install', 'chromium'], {
      cwd: REPO_ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
      // The environment has to be passed explicitly, and this is the part
      // that matters: PLAYWRIGHT_BROWSERS_PATH was set by a runtime write to
      // `process.env`, and Bun's spawn gives a child the environment the
      // process started with, not the one `process.env` holds now.
      //
      // Without this the install went to Playwright's own default directory
      // while the check above, and the tests, looked in the durable one. The
      // browser was then never found: the install said nothing, the check
      // said no, and every test in the run died with "Executable doesn't
      // exist" -- which reads like a broken test environment and says
      // nothing about the product.
      env: { ...process.env },
    })

    const output = `${install.stdout.toString()}${install.stderr.toString()}`
    if (install.exitCode !== 0) {
      console.error(`❌ \`playwright install chromium\` failed (exit code ${install.exitCode}):\n${output.trim()}`)
      process.exit(1)
    }

    chromiumInstalled = await browsersPresent(browsersPath)
    if (!chromiumInstalled) {
      // The download reported success and the browser is still not there.
      // Failing here, with the path, costs a second; failing eight minutes
      // later inside a browser launch costs the whole gate and says nothing
      // about the cause.
      console.error(
        `❌ The Playwright browser is still not in ${browsersPath} after the install.\n` +
          `   The install reported success, so something removed it afterwards, or it\n` +
          `   went somewhere else. Check the directory, and check that nothing on this\n` +
          `   host is reaping it.`
      )
      process.exit(1)
    }
  }

  if (!process.env.PLAYWRIGHT_ADMIN_EMAIL || !process.env.PLAYWRIGHT_ADMIN_PASSWORD) {
    console.error('🚫 e2e gate requires PLAYWRIGHT_ADMIN_EMAIL and PLAYWRIGHT_ADMIN_PASSWORD')
    process.exit(1)
  }

  // Optional: limit to chromium for speed on pre-push
  const project = process.env.E2E_PROJECT ?? 'chromium'

  console.log(`🧪 Running library resilience e2e (project=${project})...`)

  // library-resilience guards the /library/books crash class.
  // play-button guards the "press play on the cover and nothing happens" class,
  // which the API contract tests could not see: the endpoint returned a valid
  // session while the button itself was inert.
  // playback-progress is the stronger sibling: it proves audio bytes arrive and
  // the playhead actually advances, which is the only assertion that catches a
  // session that mounts a player and then plays nothing.
  // cover-fallback guards the no-cover path: a book whose cover_path is the
  // terminal "missing" sentinel must render the placeholder without requesting a
  // cover that can only 404 (and be blocked by the browser as a JSON body).
  // player-track guards the GPU track layer's fallback: the DOM role="slider" must
  // stay the single accessible control and must keep receiving pointer and keyboard
  // seeks, so the WebGPU layer can never take the scrubber down with it.
  const SPECS = [
    'tests/e2e/library-resilience.spec.ts',
    'tests/e2e/play-button.spec.ts',
    'tests/e2e/playback-progress.spec.ts',
    'tests/e2e/cover-fallback.spec.ts',
    'tests/e2e/player-track.spec.ts',
  ]

  /**
   * `--bun` forces Playwright onto Bun's runtime instead of Node.js. Without it
   * the `playwright` bin runs under Node (its shebang wins), and this repository
   * has no Node.js runtime.
   *
   * Playwright skips its own TypeScript transform when it detects Bun
   * (`registerESMLoader` returns early for it), so the specs rely on Bun's
   * native TS loader. That only works because tests/e2e/package.json marks the
   * directory as ESM — Playwright then loads the specs with `import()` instead
   * of `require()`, and Bun transpiles them itself.
   */
  const runE2e = (): { exitCode: number; output: string } => {
    const result = Bun.spawnSync(
      ['bun', 'x', '--bun', 'playwright', 'test', ...SPECS, `--project=${project}`, '--reporter=line'],
      {
        cwd: REPO_ROOT,
        stdout: 'pipe',
        stderr: 'pipe',
        // The environment has to be passed explicitly.
        //
        // Bun's spawn gives the child the environment the process started
        // with, not the one `process.env` holds now: a runtime write to
        // `process.env` does not reach the child's environment. That is true
        // of Bun 1.4.3 and of the canary alike, so it is a long-standing
        // behaviour rather than a regression.
        //
        // It matters here because the port pinning above is a runtime write.
        // Without this, the Playwright child fell back to `.env.local` --
        // `bun x` loads env files for the package it runs, and a variable in
        // the real environment wins over a file -- so the dev server was
        // started on one port and the specs were pointed at another, and every
        // navigation failed with ERR_CONNECTION_REFUSED.
        env: { ...process.env },
      }
    )
    return {
      exitCode: result.exitCode ?? 1,
      output: `${result.stdout.toString()}${result.stderr.toString()}`,
    }
  }

  /**
   * How many 5xx responses the API answered with while the suite ran.
   *
   * The web app calls the backend for the data the player needs: the
   * playback session, the similar items, the library rows. A backend that
   * answers 500 makes the *product* look broken -- the Play button never
   * becomes Pause because the session was never created, and the failure
   * lands on an assertion about the UI.
   *
   * Counting them turns "the product is broken" into "the product is
   * broken, or the backend was failing while this ran", which is the
   * difference between an hour of chasing a regression and a re-run. It
   * reports; it does not pass or fail the gate.
   */
  const reportServerErrors = (output: string): void => {
    const serverErrors = countServerErrors(output)
    if (serverErrors === 0) return
    console.log('')
    console.log(`⚠️  The API answered ${serverErrors} request(s) with a 5xx while the suite ran.`)
    console.log('   A backend that answers 500 makes the product look broken: the Play button')
    console.log('   never becomes Pause because the session was never created, and the failure')
    console.log('   lands on an assertion about the UI. Re-run before chasing it.')
  }

  /**
   * Host memory, printed only when the run looks like an infrastructure
   * failure. Delegates to the shared preflight so the numbers quoted in a CI
   * log, in a bug report, and on a developer's terminal are produced by
   * exactly one script -- three copies of this arithmetic is how they drift
   * apart and start lying.
   *
   * The peak from during the run is reported first, when there is one. A
   * snapshot taken after the failure says the host was healthy at exactly
   * the moment it was not: the dev server that was killed has already given
   * its memory back.
   */
  const reportHostPressure = (peak?: HostPeak): void => {
    if (peak && Number.isFinite(peak.memFreePct)) {
      console.log(
        `🖥️  Worst host pressure during the run: ${peak.memFreePct}% memory free, ` +
          `${peak.swapFreePct}% swap free, dev server up to ${peak.devServerMb} MB.`
      )
    }

    Bun.spawnSync(['bun', 'run', 'scripts/host-pressure.ts', '--report'], {
      cwd: REPO_ROOT,
      stdio: ['inherit', 'inherit', 'inherit'],
    })
  }

  /**
   * Blocks until nothing is listening on the e2e port, so a retry never races a
   * server that has not finished dying.
   */
  const waitForPortFree = async (port: string): Promise<void> => {
    for (let attempt = 0; attempt < 20; attempt++) {
      if (isPortFree(port)) return
      await Bun.sleep(500)
    }
    console.log('   ⚠️  port is still held after 10s; the retry may fail to bind.')
  }

  // A dead dev server makes every remaining test fail at `page.goto('/login')`
  // with ERR_CONNECTION_REFUSED, which reads exactly like a product-wide outage
  // but is the host OOM-killing `next dev`. Measured on a memory-starved machine
  // this happened in 2 of 3 runs *without* any recent change, and in 1 of 3 with
  // it, so it is infrastructure and not a regression.
  //
  // When a run dies that way, retry once on a fresh dev server. Only if the
  // retry also dies do we report it as infrastructure, with the host's memory
  // state attached, so nobody debugs the product for a machine problem.
  const MAX_ATTEMPTS = 2
  let attempt = 1

  // The port has to be free before the first attempt, not just before a
  // retry. A leftover server on it would be reused -- Playwright is told not
  // to reuse it, and would then fail to start one of its own -- and every
  // test would fail at the first navigation with a message that points at
  // the product rather than at the port.
  if (e2ePort !== '' && !isPortFree(e2ePort)) {
    console.error(
      `❌ Port ${e2ePort} is already in use.\n` +
        `   The gate starts its own dev server there, and it will not reuse one it did\n` +
        `   not start. Whatever is holding the port has to go first.\n` +
        `   Find it with: lsof -ti :${e2ePort}\n` +
        `   Or run the gate on a different port: E2E_PORT=3200 bun run scripts/e2e-library.ts`
    )
    process.exit(1)
  }

  while (true) {
    const watch = startHostWatch()
    const { exitCode, output } = runE2e()
    const peak = watch.stop()
    process.stdout.write(output)

    if (exitCode === 0) {
      process.exit(0)
    }

    const refused = countConnectionRefused(output)
    // Playwright's "line" reporter prints one indented "  N) [project › spec]"
    // header per failed test.
    const failedCount = (output.match(/^\s+\d+\) \[/gm) ?? []).length

    // The dev server dying is the one failure a fresh server fixes, and it
    // is worth retrying whenever it happened -- not only when *every*
    // failure was a refused connection.
    //
    // The old condition required all of them to be, so a run where the
    // server died and one test happened to fail for another reason got no
    // retry at all: the one unrelated failure cancelled the recovery. The
    // question is not "were all the failures the same" but "is the server
    // still there", and that is a question about the port.
    //
    // The port question has the answer the other way round from what the
    // exit code suggests: `lsof -ti` exits zero when it finds a holder, so
    // a free port is the one that exits non-zero. Reading it the right way
    // round is what makes the retry fire when the server has died -- which
    // is the case it exists for.
    const serverAlive = isServerListening(isPortFree(e2ePort))

    if (shouldRetryOnFreshServer({ refused, attempt, maxAttempts: MAX_ATTEMPTS, port: e2ePort, isPortFree })) {
      console.log('')
      console.log(
        `⚠️  The dev server died mid-run: ${refused} of the ${failedCount} failures are ERR_CONNECTION_REFUSED.`
      )
      console.log(`   Retrying once on a fresh dev server (attempt ${attempt + 1}/${MAX_ATTEMPTS})...`)
      reportHostPressure(peak)
      // Wait for the dead server to actually release the port. Do NOT pkill
      // "next dev" here: that pattern also matches a developer's own dev server
      // on :3000, and a gate must never take out unrelated local work.
      await waitForPortFree(e2ePort || '3100')
      attempt++
      continue
    }

    if (refused > 0 && !serverAlive) {
      console.log('')
      console.log('🚫 INFRASTRUCTURE FAILURE (not a product regression): the dev server died and')
      console.log(`   ${refused} of the failures are ERR_CONNECTION_REFUSED on the login route.`)
      reportHostPressure(peak)
      console.log('   Free memory or swap on this host and re-run. See scripts/e2e-library.ts.')
    } else {
      // The host state is reported on every failing run, not only on the
      // one the script can prove is infrastructure.
      //
      // The suite is timing-sensitive: it waits for a real audio stream and
      // a real session, and it runs a browser and a dev server at the same
      // time. On a host that is already running another end-to-end suite --
      // which is the case here, where three repositories share one machine
      // -- a test that waits for the player to mount can time out on a
      // perfectly healthy build. The same specs pass in isolation.
      //
      // Reporting the host state next to a red run turns "the product is
      // broken" into "the product is broken, or the box was too busy" --
      // which is the difference between an hour of chasing a regression and
      // a re-run.
      console.log('')
      reportHostPressure(peak)

      // And the same for the backend. A 5xx from the API while the suite
      // runs is the other half of that sentence: the product may be fine
      // and the data it asked for was not there.
      reportServerErrors(output)
    }
    process.exit(1)
  }
}

main().catch((error: unknown) => {
  console.error('e2e gate failed:', error)
  process.exit(1)
})

// A module, not a script: TypeScript gives every script file a shared global
// scope, so two of these declaring `main` would collide. The `import` above
// already makes this file a module, so no `export {}` marker is needed -- and
// `@typescript-eslint/no-useless-empty-export` rightly objects to one.
