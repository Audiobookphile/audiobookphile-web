/**
 * Synthesizes a soothing, gentle ambient chime using the browser's Web Audio API.
 * Used when the sleep timer runs down to 0 to inform listeners that playback
 * stopped intentionally due to timer expiry rather than a crash or network error.
 */

let sharedAudioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return null
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new AudioCtx()
    }
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {})
    }
    return sharedAudioContext
  } catch {
    return null
  }
}

/**
 * Plays a soft 3-note ascending chime (D5 -> G5 -> B5) with gentle exponential decay.
 */
export function playSleepTimerExpiryChime(): void {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    // Soothing D major triad frequencies: D5 (587.33Hz), G5 (783.99Hz), B5 (987.77Hz)
    const notes = [
      { freq: 587.33, offset: 0, duration: 0.9 },
      { freq: 783.99, offset: 0.15, duration: 1.1 },
      { freq: 987.77, offset: 0.32, duration: 1.3 },
    ]

    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(0.12, now) // Gentle volume suitable for bedtime
    masterGain.connect(ctx.destination)

    notes.forEach(({ freq, offset: startOffset, duration }) => {
      const osc = ctx.createOscillator()
      const noteGain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + startOffset)

      // Smooth attack and natural exponential decay
      const startTime = now + startOffset
      const endTime = startTime + duration

      noteGain.gain.setValueAtTime(0.0001, startTime)
      noteGain.gain.exponentialRampToValueAtTime(0.35, startTime + 0.03)
      noteGain.gain.exponentialRampToValueAtTime(0.0001, endTime)

      osc.connect(noteGain)
      noteGain.connect(masterGain)

      osc.start(startTime)
      osc.stop(endTime)
    })
  } catch (err) {
    console.debug('[soundEffects] Sleep timer chime playback failed:', err)
  }
}
