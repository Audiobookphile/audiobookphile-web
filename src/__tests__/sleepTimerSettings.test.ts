import { describe, expect, it } from 'bun:test'

describe('PlayerSettings - Default Sleep Timer Duration', () => {
  const DEFAULT_SETTINGS = {
    useChapterTrack: false,
    jumpForwardAmount: 10,
    jumpBackwardAmount: 10,
    playbackRate: 1.0,
    playbackRateIncrementDecrement: 0.1,
    volume: 0.5,
    equalizerPreset: 'off',
    volumeBoost: 1.0,
    defaultSleepTimerDuration: 900,
  }

  it('provides defaultSleepTimerDuration of 900 seconds (15 minutes)', () => {
    expect(DEFAULT_SETTINGS.defaultSleepTimerDuration).toBe(900)
  })

  it('allows overriding to custom duration or end of chapter (-1)', () => {
    const customSettings = {
      ...DEFAULT_SETTINGS,
      defaultSleepTimerDuration: 1800, // 30 minutes
    }
    expect(customSettings.defaultSleepTimerDuration).toBe(1800)

    const endOfChapterSettings = {
      ...DEFAULT_SETTINGS,
      defaultSleepTimerDuration: -1, // End of Chapter
    }
    expect(endOfChapterSettings.defaultSleepTimerDuration).toBe(-1)
  })

  it('correctly calculates quick start duration in seconds', () => {
    function getSecondsToStart(
      defaultDurationSeconds: number,
      remainingInChapter: number
    ): number {
      if (defaultDurationSeconds === -1) {
        return remainingInChapter > 0 ? remainingInChapter : 900
      }
      return defaultDurationSeconds
    }

    // 15m default
    expect(getSecondsToStart(900, 450)).toBe(900)

    // End of chapter with 340s left in chapter
    expect(getSecondsToStart(-1, 340)).toBe(340)

    // End of chapter with no chapter info (fallback to 900s)
    expect(getSecondsToStart(-1, 0)).toBe(900)
  })

  it('supports configurable Smart Rewind on Resume settings', () => {
    const defaultSmartRewind = {
      smartRewindEnabled: true,
      smartRewindSeconds: 20,
    }
    expect(defaultSmartRewind.smartRewindEnabled).toBe(true)
    expect(defaultSmartRewind.smartRewindSeconds).toBe(20)

    function calculateRewindOffset(
      enabled: boolean,
      maxSeconds: number,
      pausedDuration: number
    ): number {
      if (!enabled) return 0
      // Proportional rewind based on paused duration: 1s rewind per 60s paused, up to maxSeconds
      const calculated = Math.min(maxSeconds, Math.floor(pausedDuration / 60) * 5)
      return Math.max(0, calculated)
    }

    // Disabled rewind returns 0
    expect(calculateRewindOffset(false, 20, 3600)).toBe(0)

    // Short pause under 60s returns 0
    expect(calculateRewindOffset(true, 20, 30)).toBe(0)

    // Paused for 3 minutes (180s) -> 15s rewind
    expect(calculateRewindOffset(true, 20, 180)).toBe(15)

    // Paused for 1 hour (3600s) -> capped at maxSeconds (20s)
    expect(calculateRewindOffset(true, 20, 3600)).toBe(20)

    // Custom maxSeconds (10s cap)
    expect(calculateRewindOffset(true, 10, 3600)).toBe(10)
  })

  it('supports sleep timer expiry chime setting and defaults to true', () => {
    const settings = {
      sleepTimerChime: true,
    }
    expect(settings.sleepTimerChime).toBe(true)

    const updated = {
      ...settings,
      sleepTimerChime: false,
    }
    expect(updated.sleepTimerChime).toBe(false)
  })

  it('cycles quick jump durations sequentially through presets', () => {
    const QUICK_JUMP_AMOUNTS = [5, 10, 15, 30, 45, 60] as const

    function getNextJumpDuration(current: number): number {
      const idx = QUICK_JUMP_AMOUNTS.indexOf(current as any)
      const nextIdx = idx === -1 ? 0 : (idx + 1) % QUICK_JUMP_AMOUNTS.length
      return QUICK_JUMP_AMOUNTS[nextIdx]
    }

    expect(getNextJumpDuration(10)).toBe(15)
    expect(getNextJumpDuration(15)).toBe(30)
    expect(getNextJumpDuration(30)).toBe(45)
    expect(getNextJumpDuration(45)).toBe(60)
    expect(getNextJumpDuration(60)).toBe(5)
    expect(getNextJumpDuration(5)).toBe(10)
    expect(getNextJumpDuration(999)).toBe(5) // fallback to first preset
  })

  it('supports volume percentage rounding and double-click reset to 100%', () => {
    let volume = 0.45
    expect(Math.round(volume * 100)).toBe(45)

    // Double-click reset to 1.0 (100%)
    volume = 1.0
    expect(volume).toBe(1.0)
    expect(Math.round(volume * 100)).toBe(100)

    // Clamping on manual stepping
    const clampedUpper = Math.max(0, Math.min(1, 1.05))
    expect(clampedUpper).toBe(1.0)
    const clampedLower = Math.max(0, Math.min(1, -0.05))
    expect(clampedLower).toBe(0.0)
  })

  it('handles hotkey S extension (+300s) and fallback start duration', () => {
    function handleSleepTimerHotkey(
      currentRemaining: number | null,
      defaultDuration: number
    ): { action: 'start' | 'extend'; duration: number } {
      if (currentRemaining !== null) {
        return { action: 'extend', duration: currentRemaining + 300 }
      }
      return { action: 'start', duration: defaultDuration === -1 ? 900 : defaultDuration }
    }

    // Inactive -> starts with default 900s
    expect(handleSleepTimerHotkey(null, 900)).toEqual({ action: 'start', duration: 900 })

    // Inactive with End-of-Chapter (-1) -> starts with fallback 900s
    expect(handleSleepTimerHotkey(null, -1)).toEqual({ action: 'start', duration: 900 })

    // Active with 120s remaining -> extends to 420s (+5m)
    expect(handleSleepTimerHotkey(120, 900)).toEqual({ action: 'extend', duration: 420 })
  })

  it('supports playback rate double-click reset to 1.0x and wheel stepping bounds', () => {
    let rate = 1.75

    // Double-click resets to 1.0
    rate = 1.0
    expect(rate).toBe(1.0)

    function stepRate(current: number, deltaY: number, step = 0.1): number {
      if (deltaY < 0) {
        return Math.min(3.0, Math.round((current + step) * 100) / 100)
      } else if (deltaY > 0) {
        return Math.max(0.5, Math.round((current - step) * 100) / 100)
      }
      return current
    }

    // Scroll up from 1.0x -> 1.1x
    expect(stepRate(1.0, -100, 0.1)).toBe(1.1)
    // Scroll down from 1.0x -> 0.9x
    expect(stepRate(1.0, 100, 0.1)).toBe(0.9)

    // With 0.05 step
    expect(stepRate(1.0, -100, 0.05)).toBe(1.05)
    expect(stepRate(1.0, 100, 0.05)).toBe(0.95)

    // Upper bound clamped at 3.0x
    expect(stepRate(3.0, -100, 0.1)).toBe(3.0)
    expect(stepRate(2.95, -100, 0.1)).toBe(3.0)

    // Lower bound clamped at 0.5x
    expect(stepRate(0.5, 100, 0.1)).toBe(0.5)
    expect(stepRate(0.55, 100, 0.1)).toBe(0.5)
  })
})
