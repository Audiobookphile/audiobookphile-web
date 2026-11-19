import { describe, expect, it } from 'bun:test'
import { formatSleepTimerRemaining } from '@/features/player/components/SleepTimerWidget'

describe('SleepTimerWidget & Countdown formatting', () => {
  it('formats remaining seconds into MM:SS format accurately', () => {
    expect(formatSleepTimerRemaining(0)).toBe('0:00')
    expect(formatSleepTimerRemaining(-10)).toBe('0:00')
    expect(formatSleepTimerRemaining(45)).toBe('0:45')
    expect(formatSleepTimerRemaining(300)).toBe('5:00')
    expect(formatSleepTimerRemaining(872)).toBe('14:32')
  })

  it('formats durations greater than 1 hour into H:MM:SS format', () => {
    expect(formatSleepTimerRemaining(3600)).toBe('1:00:00')
    expect(formatSleepTimerRemaining(3665)).toBe('1:01:05')
    expect(formatSleepTimerRemaining(7200)).toBe('2:00:00')
    expect(formatSleepTimerRemaining(7530)).toBe('2:05:30')
  })

  it('calculates sleep timer extensions correctly', () => {
    const initialSeconds = 600 // 10 minutes
    const extend5m = initialSeconds + 300 // 15 minutes
    const extend15m = initialSeconds + 900 // 25 minutes
    const extend30m = initialSeconds + 1800 // 40 minutes

    expect(extend5m).toBe(900)
    expect(extend15m).toBe(1500)
    expect(extend30m).toBe(2400)

    expect(formatSleepTimerRemaining(extend5m)).toBe('15:00')
    expect(formatSleepTimerRemaining(extend15m)).toBe('25:00')
    expect(formatSleepTimerRemaining(extend30m)).toBe('40:00')
  })

  it('identifies acoustic volume fade-out threshold (<= 15 seconds)', () => {
    const isFading = (seconds: number) => seconds <= 15 && seconds > 0
    expect(isFading(10)).toBe(true)
    expect(isFading(15)).toBe(true)
    expect(isFading(16)).toBe(false)
    expect(isFading(60)).toBe(false)
  })

  it('calculates end-of-chapter remaining time correctly', () => {
    const chapterEnd = 1200
    const currentTime = 750
    const remainingInChapter = Math.max(1, Math.round(chapterEnd - currentTime))
    expect(remainingInChapter).toBe(450)
    expect(formatSleepTimerRemaining(remainingInChapter)).toBe('7:30')
  })
})

