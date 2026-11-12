#!/usr/bin/env bun
/**
 * Choosing the tsrs build to run.
 *
 * tsrs ships a native binary for five platforms: darwin-arm64, and
 * linux-x64/linux-arm64 against glibc and musl. Everything else -- Windows,
 * Intel Macs, and the long tail of Linux architectures -- has no native
 * build, and the WebAssembly build is the only one that runs there.
 *
 * This module makes that choice, and nothing else: it says which native
 * package a platform wants, whether one is installed, and what to tell a
 * reader when neither a native binary nor the WebAssembly build is
 * available. `scripts/tsrs.ts` does the running.
 *
 * The two builds are the same compiler. The package version follows tsrs and
 * names the TypeScript version it ports, so `@tsrs/wasm` and `tsrs` at the
 * same version are the same checker, the same standard libraries and the
 * same diagnostics -- one compiled to a native binary and one compiled to
 * WebAssembly. That is what makes the fallback a fallback rather than a
 * second opinion.
 */

/**
 * The libc suffix Linux platform packages carry.
 *
 * Alpine and other musl distributions get `-musl`, everything else gets
 * `-gnu`.
 */
export const muslSuffix = (isMusl: boolean): string => (isMusl ? '-musl' : '-gnu')

/**
 * The platform package tsrs declares for a platform and architecture.
 *
 * `process.arch` reports `arm` on 32-bit ARM, and the upstream package is
 * named `linux-arm` for that target, so the name is built from the raw
 * `process.platform`/`process.arch` pair with no special-casing.
 */
export const nativePackageName = (platform: string, arch: string, isMusl: boolean): string => {
  const suffix = platform === 'linux' ? muslSuffix(isMusl) : ''
  return `@tsrs/${platform}-${arch}${suffix}`
}

/**
 * The platform packages tsrs declares, for the error message when the one
 * this machine needs was not installed.
 */
export const supportedNativePackages = (manifest: { optionalDependencies?: Record<string, string> }): string[] =>
  Object.keys(manifest.optionalDependencies ?? {})

/**
 * The native binary for this platform, or null when there is not one.
 *
 * Null means "this platform has no native build", which is not an error --
 * it is the case the WebAssembly build exists for. It also covers a native
 * build that *should* be there and is not, because the fallback works
 * either way and the reader is better served by one answer than by two.
 */
export const findNativeBinary = async (options: {
  packageName: string
  resolvePackageDir: (packageName: string) => string
  exists: (path: string) => Promise<boolean>
  isWindows: boolean
}): Promise<string | null> => {
  let packageDir: string
  try {
    packageDir = options.resolvePackageDir(options.packageName)
  } catch {
    return null
  }

  const binary = `${packageDir}/tsrs${options.isWindows ? '.exe' : ''}`
  if (!(await options.exists(binary))) {
    return null
  }
  return binary
}

/**
 * What to say when there is no compiler to run.
 *
 * Both halves matter: the native package that would have been used, so the
 * reader knows which install is incomplete, and the WebAssembly package,
 * which is the one that works everywhere.
 */
export const missingCompilerMessage = (options: {
  packageName: string
  supported: string[]
  wasmInstalled: boolean
}): string => {
  const lines = [
    `Cannot find the tsrs binary for ${options.packageName.replace('@tsrs/', '')} (${options.packageName}), and the WebAssembly build is not installed either.`,
  ]

  const isSupported = options.supported.includes(options.packageName)
  if (isSupported) {
    lines.push(
      `The package ${options.packageName} is listed in tsrs's optionalDependencies but was not installed. Common causes: installing with --no-optional / --omit=optional, a lockfile or node_modules created on another platform, or pnpm \`supportedArchitectures\` excluding this platform. Reinstall to fix.`
    )
  } else {
    lines.push(
      `There is no native tsrs build for this platform. Supported: ${options.supported.map((name) => name.replace('@tsrs/', '')).join(', ')}.`
    )
  }

  lines.push(
    options.wasmInstalled
      ? `The WebAssembly build was expected at @tsrs/wasm but could not be loaded.`
      : `Install @tsrs/wasm as well: it is the same compiler compiled to WebAssembly, and it runs on every platform.`
  )
  lines.push(`To use a locally built binary instead, set TSRS_BINARY=/path/to/tsrs.`)
  return lines.join('\n')
}
