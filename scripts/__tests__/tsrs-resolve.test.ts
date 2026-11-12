import { describe, expect, it } from 'bun:test'
import {
  findNativeBinary,
  missingCompilerMessage,
  muslSuffix,
  nativePackageName,
  supportedNativePackages,
} from '../tsrs-resolve'

/**
 * Choosing the tsrs build to run.
 *
 * The decision has one job: never leave a platform without a compiler. tsrs
 * ships a native binary for five platforms and a WebAssembly build for all
 * of them, so the failure mode to protect against is the launcher giving up
 * and leaving the type gate with nothing to run.
 *
 * The package names are the part worth pinning down: a wrong suffix here
 * means a binary that is not there, and the whole fallback chain never
 * starts.
 */

describe('nativePackageName', () => {
  it('has no libc suffix outside Linux', () => {
    expect(nativePackageName('darwin', 'arm64', false)).toBe('@tsrs/darwin-arm64')
    expect(nativePackageName('darwin', 'arm64', true)).toBe('@tsrs/darwin-arm64')
  })

  it('adds the libc suffix on Linux', () => {
    expect(nativePackageName('linux', 'arm64', false)).toBe('@tsrs/linux-arm64-gnu')
    expect(nativePackageName('linux', 'arm64', true)).toBe('@tsrs/linux-arm64-musl')
    expect(nativePackageName('linux', 'x64', false)).toBe('@tsrs/linux-x64-gnu')
    expect(nativePackageName('linux', 'x64', true)).toBe('@tsrs/linux-x64-musl')
  })

  it('keeps the 32-bit ARM target the way upstream names it', () => {
    // process.arch reports "arm" on 32-bit ARM and the upstream package is
    // "linux-arm", so the name is built from the raw pair.
    expect(nativePackageName('linux', 'arm', false)).toBe('@tsrs/linux-arm-gnu')
  })

  it('maps the libc to its suffix', () => {
    expect(muslSuffix(true)).toBe('-musl')
    expect(muslSuffix(false)).toBe('-gnu')
  })
})

describe('supportedNativePackages', () => {
  it('lists the platform packages tsrs declares', () => {
    const manifest = { optionalDependencies: { '@tsrs/darwin-arm64': '0.18.0', '@tsrs/linux-x64-gnu': '0.18.0' } }
    expect(supportedNativePackages(manifest)).toEqual(['@tsrs/darwin-arm64', '@tsrs/linux-x64-gnu'])
  })

  it('copes with a manifest that declares none', () => {
    expect(supportedNativePackages({})).toEqual([])
  })
})

describe('findNativeBinary', () => {
  const options = {
    packageName: '@tsrs/darwin-arm64',
    resolvePackageDir: (name: string) => `/pkg/${name}`,
    exists: (path: string) => Promise.resolve(path === '/pkg/@tsrs/darwin-arm64/tsrs'),
    isWindows: false,
  }

  it('finds the binary when the platform has one', async () => {
    expect(await findNativeBinary(options)).toBe('/pkg/@tsrs/darwin-arm64/tsrs')
  })

  it('returns null when the platform has no native package', async () => {
    // This is the Windows / Intel Mac case, and it is not an error: the
    // WebAssembly build is the answer, and the caller has to be able to
    // tell "no native build" from "the install is broken".
    const result = await findNativeBinary({
      ...options,
      resolvePackageDir: () => {
        throw new Error('Cannot find package')
      },
    })
    expect(result).toBeNull()
  })

  it('returns null when the package is there but the binary is not', async () => {
    const result = await findNativeBinary({ ...options, exists: () => Promise.resolve(false) })
    expect(result).toBeNull()
  })

  it('looks for a .exe on Windows', async () => {
    const result = await findNativeBinary({
      ...options,
      isWindows: true,
      exists: (path) => Promise.resolve(path === '/pkg/@tsrs/darwin-arm64/tsrs.exe'),
    })
    expect(result).toBe('/pkg/@tsrs/darwin-arm64/tsrs.exe')
  })
})

describe('missingCompilerMessage', () => {
  it('names the package and the platforms that do have a native build', () => {
    const message = missingCompilerMessage({
      packageName: '@tsrs/win32-x64',
      supported: ['@tsrs/darwin-arm64', '@tsrs/linux-x64-gnu'],
      wasmInstalled: false,
    })
    expect(message).toContain('@tsrs/win32-x64')
    expect(message).toContain('darwin-arm64')
    expect(message).toContain('@tsrs/wasm')
  })

  it('explains an incomplete install differently from an unsupported platform', () => {
    const message = missingCompilerMessage({
      packageName: '@tsrs/darwin-arm64',
      supported: ['@tsrs/darwin-arm64'],
      wasmInstalled: false,
    })
    expect(message).toContain('was not installed')
    expect(message).toContain('--no-optional')
  })

  it('still points at the escape hatch', () => {
    const message = missingCompilerMessage({
      packageName: '@tsrs/win32-x64',
      supported: [],
      wasmInstalled: false,
    })
    expect(message).toContain('TSRS_BINARY')
  })
})
