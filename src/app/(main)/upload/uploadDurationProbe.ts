import { getMimeType } from './uploadTypes'

/**
 * Client-side audio duration probing.
 *
 * The edge finalize endpoint cannot extract MP3 durations server-side
 * (music-metadata exceeds the isolate memory cap — the HTTP 546 incident),
 * so durations are probed here in the browser via HTMLAudioElement metadata
 * and shipped with the finalize payload (`files[].duration`). The backend
 * sanitizes every value (positive, finite, ≤24h/track) and derives the item
 * total as SUM(tracks); absent values stay 0 = unknown with a size-based
 * playback fallback. Probing NEVER fails an upload — every failure path
 * resolves undefined.
 */

export const PROBE_TIMEOUT_MS = 8000
export const PROBE_CONCURRENCY = 6

export function isProbableAudio(name: string, type?: string): boolean {
  if (type && type.startsWith('audio/')) return true
  return getMimeType(name).startsWith('audio/')
}

/** Probe one blob's duration in seconds, or undefined when unknowable. */
export function probeAudioDuration(file: Blob, timeoutMs = PROBE_TIMEOUT_MS): Promise<number | undefined> {
  return new Promise((resolve) => {
    if (
      typeof Audio === 'undefined' ||
      typeof URL === 'undefined' ||
      typeof (URL as unknown as { createObjectURL?: unknown }).createObjectURL !== 'function'
    ) {
      resolve(undefined)
      return
    }
    let settled = false
    const done = (value: number | undefined): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        URL.revokeObjectURL(url)
      } catch {
        // best-effort cleanup
      }
      resolve(value)
    }
    const timer = setTimeout(() => done(undefined), timeoutMs)
    let url = ''
    try {
      url = URL.createObjectURL(file)
    } catch {
      done(undefined)
      return
    }
    try {
      const audio = new Audio()
      audio.preload = 'metadata'
      audio.addEventListener(
        'loadedmetadata',
        () => {
          const d = audio.duration
          done(typeof d === 'number' && Number.isFinite(d) && d > 0 ? d : undefined)
        },
        { once: true }
      )
      audio.addEventListener('error', () => done(undefined), { once: true })
      audio.src = url
    } catch {
      done(undefined)
    }
  })
}

/** Probe many files with bounded concurrency; never rejects. */
export async function probeItemDurations<T extends { name: string; type?: string }>(
  files: T[],
  options?: { concurrency?: number; timeoutMs?: number; probe?: (file: T) => Promise<number | undefined> }
): Promise<Map<T, number>> {
  const result = new Map<T, number>()
  const concurrency = Math.max(1, options?.concurrency ?? PROBE_CONCURRENCY)
  const timeoutMs = options?.timeoutMs ?? PROBE_TIMEOUT_MS
  const runProbe =
    options?.probe ??
    ((file: T) =>
      isProbableAudio(file.name, file.type)
        ? probeAudioDuration(file as unknown as Blob, timeoutMs)
        : Promise.resolve(undefined))
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, files.length) }, async () => {
    while (cursor < files.length) {
      const file = files[cursor++]
      try {
        const duration = await runProbe(file)
        if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
          result.set(file, duration)
        }
      } catch {
        // probing must never fail the upload
      }
    }
  })
  await Promise.all(workers)
  return result
}
