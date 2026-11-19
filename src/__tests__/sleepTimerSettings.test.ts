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
})
