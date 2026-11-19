import { describe, expect, it } from 'bun:test'
import { secondsToTimestamp } from '@/shared/lib/datefns'

interface TestBookmark {
  id: string
  time_pos: number
  title: string | null
  note?: string | null
}

function filterBookmarks(bookmarks: TestBookmark[], searchQuery: string): TestBookmark[] {
  const query = searchQuery.trim().toLowerCase()
  if (!query) return bookmarks
  return bookmarks.filter((bm) => {
    const titleMatch = (bm.title || '').toLowerCase().includes(query)
    const noteMatch = (bm.note || '').toLowerCase().includes(query)
    const timeMatch = secondsToTimestamp(bm.time_pos / 1000).toLowerCase().includes(query)
    return titleMatch || noteMatch || timeMatch
  })
}

function applyQuickTag(currentNote: string, tag: string): string {
  const tagPrefix = `[${tag}] `
  if (currentNote.includes(tagPrefix)) return currentNote
  return tagPrefix + currentNote
}

function buildBookmarkShareUrl(baseUrl: string, timePosMs: number): string {
  const url = new URL(baseUrl)
  const timeSec = Math.round(timePosMs / 1000)
  url.searchParams.set('t', timeSec.toString())
  return url.toString()
}

describe('Bookmarks Enhancements (Search, Quick Tags, Share Timestamp Link)', () => {
  const sampleBookmarks: TestBookmark[] = [
    {
      id: 'bm-1',
      time_pos: 75000, // 01:15
      title: 'Opening Thesis',
      note: 'The spice must flow through the cosmos.',
    },
    {
      id: 'bm-2',
      time_pos: 3600000, // 01:00:00
      title: 'Desert Walk Scene',
      note: 'Walk without rhythm and it won\'t attract the worm.',
    },
    {
      id: 'bm-3',
      time_pos: 5400000, // 01:30:00
      title: 'Gom Jabbar Trial',
      note: 'Fear is the mind-killer.',
    },
  ]

  it('filters bookmarks by title keyword case-insensitively', () => {
    const results = filterBookmarks(sampleBookmarks, 'thesis')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('bm-1')
  })

  it('filters bookmarks by note content keyword', () => {
    const results = filterBookmarks(sampleBookmarks, 'mind-killer')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('bm-3')
  })

  it('filters bookmarks by timestamp representation', () => {
    // 01:15 matches 75000ms
    const results = filterBookmarks(sampleBookmarks, '01:15')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('bm-1')
  })

  it('returns all bookmarks when search query is empty or whitespace', () => {
    expect(filterBookmarks(sampleBookmarks, '')).toHaveLength(3)
    expect(filterBookmarks(sampleBookmarks, '   ')).toHaveLength(3)
  })

  it('prepends quick category tag and prevents duplicate insertion', () => {
    let note = 'This was a memorable line.'
    note = applyQuickTag(note, 'Quote')
    expect(note).toBe('[Quote] This was a memorable line.')

    // Applying same tag again is idempotent
    note = applyQuickTag(note, 'Quote')
    expect(note).toBe('[Quote] This was a memorable line.')

    // Applying a second tag prepends before the first
    note = applyQuickTag(note, 'Key Idea')
    expect(note).toBe('[Key Idea] [Quote] This was a memorable line.')
  })

  it('generates accurate timestamped bookmark share links', () => {
    const url = buildBookmarkShareUrl('https://app.audiobookphile.com/library/item-123', 75400)
    expect(url).toBe('https://app.audiobookphile.com/library/item-123?t=75')

    const hourUrl = buildBookmarkShareUrl('https://app.audiobookphile.com/library/item-123', 3600000)
    expect(hourUrl).toBe('https://app.audiobookphile.com/library/item-123?t=3600')
  })
})
