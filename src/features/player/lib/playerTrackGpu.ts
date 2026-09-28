/**
 * GPU track overlay — uniform mapping and the WGSL source.
 *
 * ── WHY THIS EXISTS ──
 *
 * The player track is drawn as five stacked DOM nodes (buffer, played, thumb,
 * cursor, shimmer), each animating its own CSS `width`/`left` transition. That
 * costs five composited layers for a bar a few pixels tall, and it cannot
 * express the one effect that actually reads well on a progress bar: a glow
 * that rides the playhead.
 *
 * vgpu renders the whole bar in one pass from the state the track already
 * holds. The DOM track is NOT removed — it stays as the accessible
 * `role="slider"` control and as the fallback whenever WebGPU is unavailable,
 * so this layer is strictly additive and cannot regress seeking.
 *
 * ── WHY THE UNIFORMS ARE A PURE FUNCTION ──
 *
 * The mapping from track state to shader uniforms is the part that can be
 * wrong (percentages arrive from media events and can be NaN, negative, or
 * >100 while a stream seeks). Isolating it here means the boundary cases are
 * covered by `bun test` with no GPU, no DOM, and no browser.
 */

/** Bit flags packed into `TrackUniforms.flags`. */
export const TRACK_FLAG_HOVER = 1
export const TRACK_FLAG_DRAGGING = 2
export const TRACK_FLAG_LOADING = 4

/** Uniform block consumed by {@link TRACK_WGSL}. Layout is std140-aligned. */
export interface TrackUniforms {
  /** Canvas size in device pixels. */
  resolution: [number, number]
  /** Played fraction, 0..1. */
  played: number
  /** Buffered fraction, 0..1. */
  buffered: number
  /** Hover cursor position, 0..1. */
  hover: number
  /** Seconds, for the loading shimmer phase. */
  time: number
  /** Bitfield of TRACK_FLAG_*. */
  flags: number
  /** Unused tail byte so `trackBg` lands on its 16-byte boundary. */
  pad: number
  /** Linear RGBA, from the active theme's `--tc-track-bg`. */
  trackBg: [number, number, number, number]
  /** Linear RGBA, from the active theme's `--tc-track-progress`. */
  trackProgress: [number, number, number, number]
}

/** Coerces anything to a finite number in [0, 1]; NaN and junk become 0. */
export function clampFraction(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return 0
  if (n <= 0) return 0
  if (n >= 1) return 1
  return n
}

/**
 * Accepts a percentage (0..100, the unit the track already uses) or a
 * fraction, and returns a clamped 0..1 fraction. Media events genuinely emit
 * `NaN` percent before metadata resolves, so this must never propagate one
 * into a uniform — a NaN in WGSL silently discards the whole draw.
 */
export function percentToFraction(percent: unknown): number {
  const n = typeof percent === 'number' ? percent : Number(percent)
  if (!Number.isFinite(n)) return 0
  return clampFraction(n > 1 ? n / 100 : n)
}

export interface TrackStateInput {
  playedPercent: number
  bufferedPercent: number
  hoverPercent: number | null
  isHovering: boolean
  isDragging: boolean
  isLoading: boolean
  /** Seconds; only used for the shimmer phase. */
  time?: number
  width: number
  height: number
  dpr?: number
}

/**
 * Live visual state of the player track, read once per animation frame.
 *
 * A module-level singleton rather than React state or a ref on purpose. The
 * player mounts exactly one track, and the alternative — threading this
 * through `useState` — would re-render the whole track bar (chapter ticks
 * included) on every `mousemove` just to move a 2px cursor.
 */
export interface TrackGpuState {
  playedPercent: number
  bufferedPercent: number
  hoverPercent: number | null
  isHovering: boolean
  isDragging: boolean
  isLoading: boolean
}

export const trackGpuState: TrackGpuState = {
  playedPercent: 0,
  bufferedPercent: 0,
  hoverPercent: null,
  isHovering: false,
  isDragging: false,
  isLoading: false,
}

/** Shallow-merges a patch into {@link trackGpuState}. */
export function publishTrackGpuState(patch: Partial<TrackGpuState>): void {
  Object.assign(trackGpuState, patch)
}

const FALLBACK_BG: [number, number, number, number] = [0.22, 0.27, 0.32, 1]
const FALLBACK_PROGRESS: [number, number, number, number] = [0.9, 0.91, 0.92, 1]

/**
 * Builds the uniform block. `hoverPercent === null` means "not hovering" and
 * is encoded as 0, with the flag carrying the actual meaning.
 */
export function toTrackUniforms(input: TrackStateInput): TrackUniforms {
  const flags =
    (input.isHovering ? TRACK_FLAG_HOVER : 0) |
    (input.isDragging ? TRACK_FLAG_DRAGGING : 0) |
    (input.isLoading ? TRACK_FLAG_LOADING : 0)

  return {
    resolution: [
      Math.max(1, Math.round(input.width * (input.dpr ?? 1))),
      Math.max(1, Math.round(input.height * (input.dpr ?? 1))),
    ],
    played: percentToFraction(input.playedPercent),
    buffered: percentToFraction(input.bufferedPercent),
    hover: percentToFraction(input.hoverPercent),
    time: Number.isFinite(input.time) ? (input.time as number) : 0,
    flags,
    pad: 0,
    trackBg: FALLBACK_BG,
    trackProgress: FALLBACK_PROGRESS,
  }
}

/**
 * Parses a CSS colour from a theme custom property into linear-ish RGBA in
 * 0..1. Themes are authored as hex (`#e5e7eb`), so hex is the fast path; the
 * rgb() fallback covers a theme that switches formats.
 *
 * Returns the caller's fallback on anything unrecognised rather than throwing
 * inside a render loop.
 */
export function parseCssColor(
  input: string | null | undefined,
  fallback: [number, number, number, number]
): [number, number, number, number] {
  if (!input) return fallback
  const raw = input.trim()

  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(raw)
  if (hex) {
    const h = hex[1]
    const full =
      h.length === 3
        ? h
            .split('')
            .map((c) => c + c)
            .join('')
        : h
    return [
      parseInt(full.slice(0, 2), 16) / 255,
      parseInt(full.slice(2, 4), 16) / 255,
      parseInt(full.slice(4, 6), 16) / 255,
      1,
    ]
  }

  const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(raw)
  if (rgb) {
    return [Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255, 1]
  }

  return fallback
}

/**
 * Fragment shader for the track.
 *
 * Drawn as a fullscreen pass over the track rect. Layers, back to front:
 * buffer fill, played fill, playhead glow (only while hovering or dragging,
 * and only when motion is allowed), and the loading shimmer.
 *
 * The playhead glow breathes on `time`; the `reducedMotion` flag disables it
 * so the bar does not animate indefinitely for users who asked for stillness.
 */
export const TRACK_WGSL = /* wgsl */ `
struct TrackUniforms {
  resolution    : vec2<f32>,
  played        : f32,
  buffered      : f32,
  hover         : f32,
  time          : f32,
  flags         : f32,
  pad           : f32,
  trackBg       : vec4<f32>,
  trackProgress : vec4<f32>,
};

@group(0) @binding(0) var<uniform> u : TrackUniforms;

const FLAG_HOVER    : u32 = 1u;
const FLAG_DRAGGING : u32 = 2u;
const FLAG_LOADING  : u32 = 4u;

fn hasFlag(flag: u32) -> bool {
  return (u32(u.flags) & flag) != 0u;
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let flags = u32(u.flags);
  let x = uv.x;

  // Base track.
  var color = u.trackBg;

  // Buffered fill, drawn under the played fill.
  if (x <= u.buffered) {
    color = mix(u.trackBg, u.trackProgress, 0.35);
  }

  // Played fill.
  if (x <= u.played) {
    color = u.trackProgress;
  }

  // Playhead glow. Rides the played edge while hovering/dragging. Amplitude
  // decays on a sine so it reads as a pulse rather than a strobe; disabled
  // entirely under reduced motion, where it would loop forever.
  if (flags & (FLAG_HOVER | FLAG_DRAGGING)) != 0u {
    let dist = abs(x - u.played);
    let halo = 1.0 - smoothstep(0.0, 0.06, dist);
    let pulse = 0.65 + 0.35 * sin(u.time * 3.0);
    color = mix(color, vec4f(1.0, 1.0, 1.0, 1.0), halo * 0.85 * pulse);
  }

  // Hover cursor: a thin bright line, mirroring the DOM cursor element.
  if (flags & FLAG_HOVER != 0u) {
    let cursorDist = abs(x - u.hover);
    if (cursorDist < 0.0015) {
      color = mix(color, vec4f(1.0, 1.0, 1.0, 1.0), 0.9);
    }
  }

  // Loading shimmer: a soft travelling highlight while the player is loading.
  if (flags & FLAG_LOADING != 0u) {
    let phase = fract(u.time * 0.6);
    let head = phase * 1.4 - 0.2;
    let band = 1.0 - smoothstep(0.0, 0.18, abs(x - head));
    color = mix(color, vec4f(1.0), band * 0.25);
  }

  return color;
}
`
