'use client'

import { useEffect, useRef } from 'react'
import { parseCssColor, TRACK_WGSL, toTrackUniforms, trackGpuState } from '@/features/player/lib/playerTrackGpu'

interface PlayerTrackGpuOverlayProps {
  /** The DOM track element, used for measurement and theme-token lookup. */
  trackRef: React.RefObject<HTMLDivElement | null>
}

export default function PlayerTrackGpuOverlay({ trackRef }: PlayerTrackGpuOverlayProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvasEl = canvasRef.current
    const trackEl = trackRef.current
    if (!canvasEl || !trackEl) return

    // Feature detection first: without WebGPU the module is never imported and
    // the canvas stays transparent, so the DOM track remains the only visual.
    if (typeof navigator === 'undefined' || !('gpu' in navigator)) return

    // Bound once so the async boot closure never re-reads a ref that a later
    // render may have nulled.
    const canvas: HTMLCanvasElement = canvasEl
    const track: HTMLDivElement = trackEl

    let cancelled = false
    let frame = 0
    let gpu: { dispose: () => void } | null = null
    let surface: { dispose: () => void } | null = null

    async function boot(): Promise<void> {
      try {
        const vgpu = await import('vgpu')
        if (cancelled) return

        // `init()` resolves the adapter and device asynchronously in every
        // runtime (browser, Dawn, mock) even though the published type reads as
        // synchronous, so it is awaited unconditionally.
        gpu = (await vgpu.init()) as unknown as { dispose: () => void }
        if (cancelled) {
          gpu.dispose()
          gpu = null
          return
        }

        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const rect = track.getBoundingClientRect()
        const width = Math.max(1, Math.round(rect.width * dpr))
        const height = Math.max(1, Math.round(rect.height * dpr))

        surface = vgpu.surface(gpu as never, canvas, {
          dpr,
          size: [width, height],
          label: 'player-track',
        })
        if (cancelled) {
          surface.dispose()
          surface = null
          return
        }

        const fx = vgpu.effect(gpu as never, TRACK_WGSL, { label: 'player-track' })

        const styles = getComputedStyle(track)
        const trackBg = parseCssColor(styles.getPropertyValue('--tc-track-bg'), [0.22, 0.27, 0.32, 1])
        const trackProgress = parseCssColor(styles.getPropertyValue('--tc-track-progress'), [0.9, 0.91, 0.92, 1])

        const motionQuery =
          typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
        const reducedMotion = motionQuery?.matches ?? false

        fx.set({
          u: {
            resolution: [width, height],
            played: 0,
            buffered: 0,
            hover: 0,
            time: 0,
            flags: 0,
            pad: 0,
            trackBg,
            trackProgress,
          },
        })
        await fx.compile(surface as never)
        if (cancelled) return

        const draw = (): void => {
          if (cancelled) return
          frame = requestAnimationFrame(draw)

          // The track is a few pixels tall and its box is cheap to read here
          // (a single element, no layout thrash across siblings), and reading
          // it each frame is what keeps the layer aligned through the hover
          // scale transform and any container reflow.
          const box = track.getBoundingClientRect()
          const s = trackGpuState

          const next = toTrackUniforms({
            playedPercent: s.playedPercent,
            bufferedPercent: s.bufferedPercent,
            hoverPercent: s.hoverPercent,
            isHovering: s.isHovering,
            isDragging: s.isDragging,
            isLoading: s.isLoading,
            // Reduced motion freezes the phase: no breathing glow, no shimmer.
            time: reducedMotion ? 0 : performance.now() / 1000,
            width: box.width,
            height: box.height,
            dpr,
          })

          fx.set({
            u: {
              ...next,
              trackBg,
              trackProgress,
            },
          })
          fx.draw(surface as never)
        }

        frame = requestAnimationFrame(draw)
      } catch {
        // No adapter, shader rejection, or a lost device: fall through. The
        // DOM track is the real control, so this layer can fail silently.
        if (surface && !cancelled) surface.dispose()
        surface = null
      }
    }

    void boot()

    return () => {
      cancelled = true
      if (frame) cancelAnimationFrame(frame)
      surface?.dispose()
      surface = null
      gpu?.dispose()
      gpu = null
    }
  }, [trackRef])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-cyid="player-track-gpu"
      className="pointer-events-none absolute inset-0 h-full w-full rounded-full"
    />
  )
}
