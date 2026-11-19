import { describe, expect, it } from 'bun:test'
import { secondsToTimestamp } from '@/shared/lib/datefns'

describe('Chapter Progress Calculation', () => {
  const chapter = {
    id: 1,
    start: 600, // 10:00
    end: 1800,  // 30:00 (duration: 1200s / 20m)
    title: 'Chapter 2',
  }

  it('calculates remaining chapter time accurately', () => {
    const currentTime = 900 // 15:00 (5m into chapter, 15m remaining)
    const remainingInChapter = Math.max(0, chapter.end - currentTime)
    expect(remainingInChapter).toBe(900)
    expect(secondsToTimestamp(remainingInChapter)).toBe('15:00')
  })

  it('calculates chapter progress percentage accurately', () => {
    const duration = chapter.end - chapter.start // 1200
    const currentTime = 1200 // halfway through (600s in)
    const progressPercent = Math.min(100, Math.max(0, ((currentTime - chapter.start) / duration) * 100))
    expect(progressPercent).toBe(50)
  })

  it('clamps progress percentage cleanly at boundaries', () => {
    const duration = chapter.end - chapter.start

    // Before chapter start
    const beforeProgress = Math.min(100, Math.max(0, ((500 - chapter.start) / duration) * 100))
    expect(beforeProgress).toBe(0)

    // After chapter end
    const afterProgress = Math.min(100, Math.max(0, ((2000 - chapter.start) / duration) * 100))
    expect(afterProgress).toBe(100)
  })
})
