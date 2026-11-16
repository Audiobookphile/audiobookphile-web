import { describe, expect, it } from 'bun:test'
import { filterChapters } from '@/features/player/components/ChaptersModal'
import type { Chapter } from '@/types/api'

describe('filterChapters', () => {
  const sampleChapters: Chapter[] = [
    { id: 0, start: 0, end: 120, title: 'Prologue: The Awakening' },
    { id: 1, start: 120, end: 350, title: 'Chapter 1: The Journey Begins' },
    { id: 2, start: 350, end: 600, title: 'Chapter 2: Shadows in the Mist' },
    { id: 3, start: 600, end: 900, title: 'Interlude: Letters Home' },
    { id: 4, start: 900, end: 1200, title: 'Epilogue' },
  ]

  it('returns all chapters when query is empty or only whitespace', () => {
    expect(filterChapters(sampleChapters, '')).toEqual(sampleChapters)
    expect(filterChapters(sampleChapters, '   ')).toEqual(sampleChapters)
  })

  it('filters chapters by title substring case-insensitively', () => {
    const results = filterChapters(sampleChapters, 'prologue')
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Prologue: The Awakening')

    const shadows = filterChapters(sampleChapters, 'SHADOWS')
    expect(shadows).toHaveLength(1)
    expect(shadows[0].id).toBe(2)
  })

  it('filters by 1-based chapter number', () => {
    // displayed number for id 0 is 1, id 1 is 2, id 2 is 3, etc.
    const ch3 = filterChapters(sampleChapters, '3')
    expect(ch3.some((c) => c.id === 2)).toBe(true)
  })

  it('filters by "chapter X" query', () => {
    const ch2 = filterChapters(sampleChapters, 'chapter 2')
    expect(ch2.some((c) => c.id === 1)).toBe(true)
  })

  it('returns empty array when query has no matches', () => {
    const noMatch = filterChapters(sampleChapters, 'nonexistent chapter')
    expect(noMatch).toEqual([])
  })
})

