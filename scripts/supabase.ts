#!/usr/bin/env bun
/**
 * Bun-native launcher for the Supabase CLI.
 *
 * The `supabase` package ships `dist/supabase.js`, a `#!/usr/bin/env node`
 * wrapper whose entire job is to work out which platform binary to run and
 * spawn it. It reaches for `node:child_process`, `node:module` and `node:os`
 * to do work Bun can do natively, and it is a Node runtime entry point in a
 * repository that has no Node runtime.
 *
 * This launcher does the same job with no Node API in the path:
 *
 *   1. Work out the platform package (`@supabase/cli-<os>-<arch>[-musl]`) the
 *      same way upstream does, including the musl probe on Linux.
 *   2. Resolve it with `Bun.resolveSync` instead of `module.createRequire`.
 *   3. `process.execve` the native binary, replacing this process outright.
 *      There is no parent to forward signals through, so a Ctrl-C reaches the
 *      CLI directly and the exit code is the CLI's own.
 *
 * `SUPABASE_CLI_BINARY_OVERRIDE` overrides the resolved path, exactly as
 * upstream, for running a locally built binary through the same entry point.
 *
 * Usage:
 *   bun run scripts/supabase.ts db push
 *   bun run scripts/supabase.ts gen types typescript --linked
 */

const REPO_ROOT = `${import.meta.dir}/..`

/**
 * The libc suffix Linux platform packages carry. Alpine and other musl
 * distributions get `-musl`, everything else gets `-gnu`.
 *
 * The probes mirror the upstream launcher: read `/usr/bin/ldd` and look for
 * "musl" (ldd is not always installed there), then ask `process.report` for
 * the runtime's glibc version, then fall back to running `ldd --version`.
 * Unknown hosts default to GNU, which is what upstream does too.
 */
async function isMusl(): Promise<boolean> {
  try {
    if ((await Bun.file('/usr/bin/ldd').text()).includes('musl')) {
      return true
    }
  } catch {
    // ldd is not always installed at /usr/bin/ldd.
  }

  try {
    const report = process.report?.getReport?.() as
      { header?: { glibcVersionRuntime?: string }; sharedObjects?: string[] } | undefined
    if (report?.header?.glibcVersionRuntime) return false
    if (report?.sharedObjects?.some((file) => file.includes('libc.musl-') || file.includes('ld-musl-'))) {
      return true
    }
  } catch {
    // A disabled report leaves the final ldd probe.
  }

  try {
    const result = Bun.spawnSync(['ldd', '--version'], { stdout: 'pipe', stderr: 'pipe' })
    const output = `${result.stdout.toString()}${result.stderr.toString()}`
    return output.includes('musl')
  } catch {
    return false
  }
}

/**
 * The platform packages the `supabase` package declares, for the error
 * message when the one this machine needs was not installed.
 */
async function supportedPlatformPackages(): Promise<string[]> {
  try {
    const manifest = JSON.parse(await Bun.file(`${REPO_ROOT}/node_modules/supabase/package.json`).text()) as {
      optionalDependencies?: Record<string, string>
    }
    return Object.keys(manifest.optionalDependencies ?? {})
  } catch {
    return []
  }
}

/**
 * The candidate platform package names for this machine, most specific first.
 *
 * On Linux the glibc build is tried before the musl build, which is the order
 * upstream uses. A host that is neither resolves to the glibc package and
 * fails to start it, which is the same failure upstream produces.
 */
async function platformPackageCandidates(): Promise<string[]> {
  const platform = process.platform
  const arch = process.arch

  if (platform === 'darwin') {
    return arch === 'arm64' ? ['@supabase/cli-darwin-arm64'] : ['@supabase/cli-darwin-x64']
  }
  if (platform === 'win32') {
    return arch === 'arm64' ? ['@supabase/cli-windows-arm64'] : ['@supabase/cli-windows-x64']
  }
  if (platform === 'linux') {
    const libc = (await isMusl()) ? 'musl' : 'gnu'
    return arch === 'arm64' ? [`@supabase/cli-linux-arm64-${libc}`] : [`@supabase/cli-linux-x64-${libc}`]
  }
  return []
}

/**
 * Resolve the native supabase binary, or explain precisely why it cannot be
 * found.
 */
async function resolveBinary(): Promise<string> {
  const override = process.env.SUPABASE_CLI_BINARY_OVERRIDE
  if (override) {
    if (!(await Bun.file(override).exists())) {
      throw new Error(`SUPABASE_CLI_BINARY_OVERRIDE is set to ${override}, which does not exist.`)
    }
    return override
  }

  const candidates = await platformPackageCandidates()
  const supported = await supportedPlatformPackages()

  for (const packageName of candidates) {
    let packageDir: string
    try {
      packageDir = Bun.resolveSync(`${packageName}/package.json`, REPO_ROOT).replace(/\/package\.json$/, '')
    } catch {
      continue
    }

    const binary = `${packageDir}/bin/supabase${process.platform === 'win32' ? '.exe' : ''}`
    if (await Bun.file(binary).exists()) {
      return binary
    }
  }

  const wanted = candidates.map((name) => name.slice('@supabase/'.length)).join(', ')
  throw new Error(
    [
      `Cannot find the optional dependency for this platform (${wanted}), which contains the supabase binary.`,
      supported.includes(candidates[0] ?? '')
        ? `It is listed in supabase's optionalDependencies but was not installed. Common causes: installing with --no-optional / --omit=optional, or a lockfile or node_modules created on another platform. Reinstall to fix.`
        : `This platform is not supported. Supported: ${supported.map((name) => name.slice('@supabase/'.length)).join(', ')}.`,
      `To use a locally built binary instead, set SUPABASE_CLI_BINARY_OVERRIDE=/path/to/supabase.`,
    ].join('\n')
  )
}

async function main(): Promise<void> {
  let binary: string
  try {
    binary = await resolveBinary()
  } catch (error) {
    console.error(`supabase: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }

  const args = process.argv.slice(2)

  // Replace this process with the CLI. Bun supports process.execve, and using
  // it means the CLI inherits the terminal directly: no signal forwarding, no
  // extra process, and the exit code is the CLI's own.
  const bunProcess = process as unknown as {
    execve?: (path: string, args: string[], env: NodeJS.ProcessEnv) => void
  }
  if (typeof bunProcess.execve === 'function') {
    try {
      bunProcess.execve(binary, [binary, ...args], process.env)
    } catch {
      // execve is not permitted in every sandbox. Fall back to spawning it.
    }
  }

  const child = Bun.spawn([binary, ...args], {
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  })

  const forwarded = ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGQUIT', 'SIGBREAK'] as const
  for (const signal of forwarded) {
    try {
      process.on(signal, () => child.kill(signal))
    } catch {
      // Signal not supported on this platform.
    }
  }

  const exitCode = await child.exited
  process.exit(exitCode)
}

await main()
