import { describe, expect, it } from 'bun:test'
import { effect, init, target } from 'vgpu/mock'
import {
  clampFraction,
  parseCssColor,
  percentToFraction,
  TRACK_FLAG_DRAGGING,
  TRACK_FLAG_HOVER,
  TRACK_FLAG_LOADING,
  TRACK_WGSL,
  toTrackUniforms,
} from '../features/player/lib/playerTrackGpu'

/**
 * The GPU track layer is verified without a GPU.
 *
 * `vgpu/mock` supplies a deterministic software adapter, so the WGSL is really
 * compiled and the draw is really encoded here in CI. What is asserted is the
 * contract that can silently break: the uniform block the shader declares must
 * match what the mapping produces, and the shader must stay valid WGSL.
 */

describe('percentToFraction', () => {
  it('converts a percentage to a fraction', () => {
    expect(percentToFraction(50)).toBe(0.5)
    expect(percentToFraction(100)).toBe(1)
    expect(percentToFraction(0)).toBe(0)
  })

  it('accepts an already-normalised fraction unchanged', () => {
    expect(percentToFraction(0.25)).toBe(0.25)
    expect(percentToFraction(1)).toBe(1)
  })

  it('clamps out-of-range and junk input instead of propagating it', () => {
    // Media events really do emit these: a negative or >100 percentage while a
    // stream seeks, and NaN before metadata resolves. A NaN reaching a WGSL
    // uniform makes the driver discard the entire draw, so it must be coerced
    // here rather than trusted.
    expect(percentToFraction(-10)).toBe(0)
    expect(percentToFraction(140)).toBe(1)
    expect(percentToFraction(Number.NaN)).toBe(0)
    expect(percentToFraction(Number.POSITIVE_INFINITY)).toBe(0)
    expect(percentToFraction(undefined)).toBe(0)
    expect(percentToFraction(null)).toBe(0)
    expect(percentToFraction('nonsense' as unknown)).toBe(0)
  })
})

describe('clampFraction', () => {
  it('keeps values inside the unit interval and clamps the rest', () => {
    expect(clampFraction(0.5)).toBe(0.5)
    expect(clampFraction(-1)).toBe(0)
    expect(clampFraction(2)).toBe(1)
    expect(clampFraction(Number.NaN)).toBe(0)
  })
})

describe('toTrackUniforms', () => {
  const base = {
    playedPercent: 40,
    bufferedPercent: 60,
    hoverPercent: null,
    isHovering: false,
    isDragging: false,
    isLoading: false,
    width: 800,
    height: 8,
  }

  it('converts percentages and scales the resolution by dpr', () => {
    const u = toTrackUniforms({ ...base, dpr: 2 })
    expect(u.played).toBe(0.4)
    expect(u.buffered).toBe(0.6)
    expect(u.resolution).toEqual([1600, 16])
  })

  it('never emits a zero-sized resolution, which a target would reject', () => {
    const u = toTrackUniforms({ ...base, width: 0, height: 0, dpr: 2 })
    expect(u.resolution).toEqual([1, 1])
  })

  it('packs hover, dragging and loading into the flag bits', () => {
    expect(toTrackUniforms(base).flags).toBe(0)
    expect(toTrackUniforms({ ...base, isHovering: true }).flags & TRACK_FLAG_HOVER).toBeTruthy()
    expect(toTrackUniforms({ ...base, isDragging: true }).flags & TRACK_FLAG_DRAGGING).toBeTruthy()
    expect(toTrackUniforms({ ...base, isLoading: true }).flags & TRACK_FLAG_LOADING).toBeTruthy()

    const all = toTrackUniforms({ ...base, isHovering: true, isDragging: true, isLoading: true }).flags
    expect(all).toBe(TRACK_FLAG_HOVER | TRACK_FLAG_DRAGGING | TRACK_FLAG_LOADING)
  })

  it('encodes "not hovering" as a zero position rather than NaN', () => {
    const u = toTrackUniforms({ ...base, isHovering: false, hoverPercent: null })
    expect(u.hover).toBe(0)
  })

  it('substitutes a finite time when the clock is unusable', () => {
    expect(toTrackUniforms({ ...base, time: Number.NaN }).time).toBe(0)
    expect(toTrackUniforms({ ...base }).time).toBe(0)
    expect(toTrackUniforms({ ...base, time: 12.5 }).time).toBe(12.5)
  })
})

describe('parseCssColor', () => {
  const fallback: [number, number, number, number] = [0, 0, 0, 1]

  it('parses the 6-digit hex the themes use', () => {
    // --tc-track-progress: #e5e7eb
    const [r, g, b] = parseCssColor('#e5e7eb', fallback)
    expect(r).toBeCloseTo(229 / 255, 5)
    expect(g).toBeCloseTo(231 / 255, 5)
    expect(b).toBeCloseTo(235 / 255, 5)
  })

  it('expands 3-digit hex', () => {
    expect(parseCssColor('#fff', fallback)).toEqual([1, 1, 1, 1])
  })

  it('parses rgb() for a theme that changes format', () => {
    const [r, g] = parseCssColor('rgb(255, 0, 128)', fallback)
    expect(r).toBe(1)
    expect(g).toBe(0)
  })

  it('falls back rather than throwing on an unparseable theme value', () => {
    expect(parseCssColor(null, fallback)).toEqual(fallback)
    expect(parseCssColor('   ', fallback)).toEqual(fallback)
    expect(parseCssColor('color-mix(in oklab, red, blue)', fallback)).toEqual(fallback)
  })
})

describe('TRACK_WGSL', () => {
  it('declares a uniform block whose members match the mapping exactly', () => {
    // A mismatch here is silent in JS and fatal on the GPU: reflection adopts
    // the WGSL layout, so a missing or renamed member means the draw never
    // lands. Assert the two stay in lockstep.
    const mapping = Object.keys(
      toTrackUniforms({
        playedPercent: 0,
        bufferedPercent: 0,
        hoverPercent: null,
        isHovering: false,
        isDragging: false,
        isLoading: false,
        width: 1,
        height: 1,
      })
    ).sort()

    const struct = /struct\s+TrackUniforms\s*\{([\s\S]*?)\}/.exec(TRACK_WGSL)
    expect(struct, 'TRACK_WGSL must declare struct TrackUniforms').toBeTruthy()
    const declared = (struct as RegExpExecArray)[1]
      .split(',')
      .map((line) => line.trim().split(':')[0].trim())
      .filter(Boolean)
      .sort()

    expect(declared).toEqual(mapping)
  })

  it('binds the uniform at group 0 binding 0, where the effect sets it', () => {
    expect(TRACK_WGSL).toContain('@group(0) @binding(0) var<uniform> u')
  })

  it('exposes a single fragment entry point for the fullscreen pass', () => {
    expect(TRACK_WGSL).toContain('@fragment')
    expect(TRACK_WGSL).toContain('fn fs_main')
  })
})

describe('gpu track shader under the mock adapter', () => {
  it('compiles, accepts the uniform block, and encodes a draw', async () => {
    // Proves the shader is valid WGSL and the uniform block binds, with no GPU
    // present. Without this, a WGSL typo would only surface in a browser that
    // actually has WebGPU — i.e. never in CI.
    const gpu = await init()
    const offscreen = target(gpu, { size: [32, 8] })

    const fx = effect(gpu, TRACK_WGSL, { label: 'test-track' })
    const u = toTrackUniforms({
      playedPercent: 25,
      bufferedPercent: 75,
      hoverPercent: 0.5,
      isHovering: true,
      isDragging: false,
      isLoading: false,
      width: 32,
      height: 8,
    })
    fx.set({ u })

    await fx.compile(offscreen)
    expect(() => fx.draw(offscreen)).not.toThrow()

    // An offscreen target has no dispose(); the gpu owns and frees it.
    gpu.dispose()
  })

  it('survives a full redraw cycle with every flag set', async () => {
    const gpu = await init()
    const offscreen = target(gpu, { size: [16, 16] })
    const fx = effect(gpu, TRACK_WGSL)
    await fx.compile(offscreen)

    const u = toTrackUniforms({
      playedPercent: 100,
      bufferedPercent: 100,
      hoverPercent: 0,
      isHovering: true,
      isDragging: true,
      isLoading: true,
      time: 3.25,
      width: 16,
      height: 16,
    })
    expect(u.flags).toBe(TRACK_FLAG_HOVER | TRACK_FLAG_DRAGGING | TRACK_FLAG_LOADING)
    fx.set({ u })
    expect(() => fx.draw(offscreen)).not.toThrow()

    gpu.dispose()
  })
})
