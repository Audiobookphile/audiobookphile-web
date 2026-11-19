import { describe, expect, it } from 'bun:test'
import { buildChapterTimestampUrl, copyChapterTimestampLink } from '@/shared/lib/chapterLink'
import type { Chapter } from '@/types/api'

describe('chapterLink utility', () => {
  const chapter1: Chapter = {
    id: 1,
    start: 3600,
    end: 4200,
    title: 'Chapter 2: Across the River',
  }

  it('builds chapter timestamp URL with baseUrl', () => {
    const url = buildChapterTimestampUrl({
      chapter: chapter1,
      baseUrl: 'https://audiobookphile.app/item/123',
    })
    expect(url).toBe('https://audiobookphile.app/item/123?t=3600')
  })

  it('preserves existing query parameters when appending timestamp', () => {
    const url = buildChapterTimestampUrl({
      chapter: chapter1,
      baseUrl: 'https://audiobookphile.app/item/123?autoplay=true',
    })
    expect(url).toContain('autoplay=true')
    expect(url).toContain('t=3600')
  })

  it('rounds fractional chapter start timestamps to whole seconds', () => {
    const fractionalChapter: Chapter = {
      id: 2,
      start: 125.75,
      end: 300,
      title: 'Fractional Chapter',
    }
    const url = buildChapterTimestampUrl({
      chapter: fractionalChapter,
      baseUrl: 'https://audiobookphile.app/item/abc',
    })
    expect(url).toBe('https://audiobookphile.app/item/abc?t=126')
  })

  it('generates item relative link when window is not available', () => {
    const url = buildChapterTimestampUrl({
      chapter: chapter1,
      itemId: 'book-456',
    })
    expect(url).toContain('t=3600')
  })
})

