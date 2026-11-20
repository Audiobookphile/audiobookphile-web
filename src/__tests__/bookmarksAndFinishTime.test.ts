import { describe, expect, it } from 'bun:test'
import { getBookmarkChapter } from '@/features/player/components/BookmarksModal'
import { formatEstimatedFinishTime } from '@/features/player/components/PlayerTrackBar'

describe('Upstream Features: Bookmarks Chapter Name & Estimated Finish Time', () => {
  const chapters = [
    { id: 1, title: 'Prologue: In the Beginning', start: 0, end: 300 },
    { id: 2, title: 'Chapter 1: The Call to Adventure', start: 300, end: 1200 },
    { id: 3, title: 'Chapter 2: Crossing the Threshold', start: 1200, end: 2400 },
  ]

  describe('getBookmarkChapter', () => {
    it('returns the chapter title when timestamp falls within bounds', () => {
      expect(getBookmarkChapter(0, chapters)).toBe('Prologue: In the Beginning')
      expect(getBookmarkChapter(150, chapters)).toBe('Prologue: In the Beginning')
      expect(getBookmarkChapter(300, chapters)).toBe('Chapter 1: The Call to Adventure')
      expect(getBookmarkChapter(950, chapters)).toBe('Chapter 1: The Call to Adventure')
      expect(getBookmarkChapter(1200, chapters)).toBe('Chapter 2: Crossing the Threshold')
      expect(getBookmarkChapter(2399, chapters)).toBe('Chapter 2: Crossing the Threshold')
    })

    it('returns null when timestamp falls outside chapters range', () => {
      expect(getBookmarkChapter(3000, chapters)).toBeNull()
    })

    it('returns null when chapters array is empty', () => {
      expect(getBookmarkChapter(100, [])).toBeNull()
    })
  })

  describe('formatEstimatedFinishTime', () => {
    it('formats today finish time with am/pm correctly', () => {
      // 2:00:00 PM on Jan 15, 2026
      const baseDate = new Date(2026, 0, 15, 14, 0, 0)
      // + 3600s (1 hour) -> 3:00 PM
      const formatted = formatEstimatedFinishTime(3600, baseDate)
      expect(formatted).toBe('Ends 3:00 PM')
    })

    it('formats 30-minute finish time with padded minutes', () => {
      const baseDate = new Date(2026, 0, 15, 9, 5, 0)
      // + 1800s (30 mins) -> 9:35 AM
      const formatted = formatEstimatedFinishTime(1800, baseDate)
      expect(formatted).toBe('Ends 9:35 AM')
    })

    it('handles midnight / rollover to tomorrow', () => {
      // 11:30 PM
      const baseDate = new Date(2026, 0, 15, 23, 30, 0)
      // + 3600s -> 0:30 AM tomorrow
      const formatted = formatEstimatedFinishTime(3600, baseDate)
      expect(formatted).toBe('Ends tom. 12:30 AM')
    })

    it('handles zero or negative remaining time gracefully', () => {
      expect(formatEstimatedFinishTime(0)).toBe('Ends now')
      expect(formatEstimatedFinishTime(-50)).toBe('Ends now')
    })
  })
})
