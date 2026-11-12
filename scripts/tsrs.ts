#!/usr/bin/env bun
/**
 * Bun-native launcher for tsrs, the Rust port of the TypeScript 7 compiler.
 *
 * The `tsrs` npm package ships a JavaScript launcher (`bin/tsrs`) whose shebang
 * is `#!/usr/bin/env node`. It resolves the platform binary and re-execs it,
 * which works under Bun -- Bun implements `process.execve` -- but it means the
 * type gate's entry point is a Node-targeted script that reaches for
 * `node:child_process` and `node:fs` to do work Bun can do natively.
 *
 * This launcher does the same job with no Node API in the path at all:
 *
 *   1. Resolve the platform package (`@tsrs/<os>-<arch>[-<libc>]`) with
 *      `Bun.resolveSync` instead of `module.createRequire`.
 *   2. Detect musl the way the upstream launcher does, using `Bun.file` and
 *      `Bun.spawnSync` rather than `node:fs` and `node:child_process`.
 *   3. `process.execve` the native binary, replacing this process outright.
 *      There is no parent to forward signals through, so a Ctrl-C reaches the
 *      compiler directly and the exit code is the compiler's own.
 *
 * The end result is the same observable behaviour as the npm launcher, with
 * one fewer runtime in the chain.
 *
 * It also serves as the command for the language server
 * (`bun run scripts/tsrs.ts --lsp -stdio`), which editors spawn as a
 * long-lived child process. For that use the native binary is resolved and
 * exec'd the same way, so the editor talks to the Rust binary and not to a
 * JavaScript shim.
 *
 * `TSRS_BINARY` overrides the resolved path, exactly as upstream, for running
 * a locally built binary through the same entry point.
 *
 * ## Where there is no native binary
 *
 * tsrs publishes a native binary for five platforms: darwin-arm64, and
 * linux-x64 and linux-arm64 against glibc and musl. There is no Windows
 * build and no Intel Mac build, and this launcher is the type gate's only
 * entry point, so on those platforms it runs the WebAssembly build of the
 * same compiler instead. See `runWasm` below, and DEPLOYMENT.md section
 * 4.2.2.
 *
 * The choice of build lives in `scripts/tsrs-resolve.ts`, which is a module
 * rather than part of this script so that it can be tested on its own.
 */

import { findNativeBinary, missingCompilerMessage, nativePackageName, supportedNativePackages } from './tsrs-resolve'

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

async function platformPackageName(): Promise<string> {
  return nativePackageName(process.platform, process.arch, process.platform === 'linux' ? await isMusl() : false)
}

/**
 * The platform packages tsrs declares, for the error message when the one
 * this machine needs was not installed.
 */
async function supportedPlatformPackages(): Promise<string[]> {
  try {
    const manifest = JSON.parse(await Bun.file(`${REPO_ROOT}/node_modules/tsrs/package.json`).text()) as {
      optionalDependencies?: Record<string, string>
    }
    return supportedNativePackages(manifest)
  } catch {
    return []
  }
}

/**
 * Resolve the native tsrs binary.
 *
 * Returns null when this platform has no native build -- which is not an
 * error, it is the case the WebAssembly build exists for. An explicit
 * `TSRS_BINARY` that does not exist is an error, and stays one: a reader
 * who asked for a specific binary should be told it is missing rather than
 * quietly given a different one.
 */
async function resolveBinary(): Promise<string | null> {
  const override = process.env.TSRS_BINARY
  if (override) {
    if (!(await Bun.file(override).exists())) {
      throw new Error(`TSRS_BINARY is set to ${override}, which does not exist.`)
    }
    return override
  }

  const packageName = await platformPackageName()

  return findNativeBinary({
    packageName,
    resolvePackageDir: (name) => Bun.resolveSync(`${name}/package.json`, REPO_ROOT).replace(/\/package\.json$/, ''),
    exists: (path) => Bun.file(path).exists(),
    isWindows: process.platform === 'win32',
  })
}

/**
 * Run the compiler from the WebAssembly build.
 *
 * tsrs publishes a native binary for five platforms -- darwin-arm64, and
 * linux-x64 and linux-arm64 against glibc and musl. Everywhere else this
 * is the only build that runs, and it is the same compiler: the package
 * version follows tsrs and names the TypeScript version it ports, so
 * `@tsrs/wasm` and `tsrs` at the same version are the same checker, the
 * same standard libraries and the same diagnostics.
 *
 * It is slower -- the native binary is a native binary -- and it runs in
 * this process rather than replacing it, so there is no execve and no
 * separate process to signal.
 *
 * The WebAssembly build does not implement `--lsp` or `--watch`, so those
 * are refused here with the reason rather than failing somewhere deeper.
 */
async function runWasm(args: string[]): Promise<number> {
  if (args.includes('--lsp') || args.includes('--watch')) {
    console.error(
      'tsrs: the WebAssembly build does not support --lsp or --watch.\n' +
        '   Those need the native binary, which this platform does not have. Use the editor\n' +
        '   language server from a platform that does, or run the type check with --noEmit.'
    )
    return 1
  }

  // The package's own types come from `index.d.ts`, which the exports map
  // points at for every condition, so the import is typed without a cast.
  // Bun resolves the `node` condition, which is the entry that reads the
  // real file system; the browser entry would only see in-memory files.
  let tsc: (typeof import('@tsrs/wasm'))['tsc']
  try {
    ;({ tsc } = await import('@tsrs/wasm'))
  } catch (error) {
    console.error(
      `tsrs: the WebAssembly build is not installed: ${error instanceof Error ? error.message : String(error)}\n` +
        '   It is the same compiler compiled to WebAssembly, and it runs on every platform.\n' +
        '   Install it with: bun add -d @tsrs/wasm'
    )
    return 1
  }

  const result = await tsc(args, {
    cwd: REPO_ROOT,
    env: process.env,
    tty: process.stdout.isTTY === true,
    stdout: 'inherit',
    stderr: 'inherit',
  })
  return result.exitCode
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  // The native binary is the fast path and the default. `TSRS_FORCE_WASM=1`
  // takes the WebAssembly build instead, which is how the fallback is
  // tested on a platform that has a native binary -- and how the two builds
  // can be compared on the same tree.
  const forceWasm = process.env.TSRS_FORCE_WASM === '1'

  if (forceWasm) {
    process.exit(await runWasm(args))
  }

  let binary: string | null
  try {
    binary = await resolveBinary()
  } catch (error) {
    // An explicit `TSRS_BINARY` that does not exist. Falling back silently
    // would give the reader a compiler they did not ask for.
    console.error(`tsrs: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }

  if (binary === null) {
    // No native build for this platform. The WebAssembly build is the same
    // compiler, and it runs here.
    const packageName = await platformPackageName()
    console.error(`tsrs: there is no native tsrs build for ${packageName.replace('@tsrs/', '')}.`)
    console.error('tsrs: falling back to the WebAssembly build of the same compiler.')
    const exitCode = await runWasm(args)
    if (exitCode !== 0) {
      console.error(
        missingCompilerMessage({
          packageName,
          supported: await supportedPlatformPackages(),
          wasmInstalled: false,
        })
      )
    }
    process.exit(exitCode)
  }

  // Replace this process with the compiler. Bun supports process.execve, and
  // using it means the compiler inherits the terminal directly: no signal
  // forwarding, no extra process, and the exit code is the compiler's own.
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
