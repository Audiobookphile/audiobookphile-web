import { describe, expect, it } from 'bun:test'
import { getBookTrackCount, isLibraryItemPlayable } from '@/shared/lib/mediaPlayability'
import { isBookMedia, isPodcastMedia } from '@/types/api/functions'
import type { BookMedia, LibraryItem } from '@/types/api'

function book(overrides: Partial<BookMedia> = {}): BookMedia {
  return {
    mediaType: 'book',
    metadata: {
      title: 'Test Book',
      authors: [],
      narrators: [],
      series: [],
      genres: [],
      explicit: false,
    },
    tags: [],
    ...overrides,
  }
}

function item(media: BookMedia | undefined, overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-1',
    libraryId: 'lib-1',
    media,
    isMissing: false,
    isInvalid: false,
    ...overrides,
  } as unknown as LibraryItem
}

describe('getBookTrackCount', () => {
  it('counts detail-payload audioFiles', () => {
    const media = book({ audioFiles: [{ index: 0 }, { index: 1 }] as never })
    expect(getBookTrackCount(media)).toBe(2)
  })

  it('falls back to numTracks on shelf payloads (no audioFiles)', () => {
    // The shelf projection omits audio_files and carries only the
    // trigger-maintained num_tracks counter. Before this, numTracks came back
    // 0 and Play was hidden for every playable book.
    expect(getBookTrackCount(book({ numTracks: 57 }))).toBe(57)
  })

  it('prefers a populated audioFiles array over a stale counter', () => {
    const media = book({ audioFiles: [{ index: 0 }] as never, numTracks: 99 })
    expect(getBookTrackCount(media)).toBe(1)
  })

  it('falls back to a known duration when the arrays are absent', () => {
    expect(getBookTrackCount(book({ duration: 69071 }))).toBe(1)
  })

  it('returns 0 for a book with no media evidence at all', () => {
    expect(getBookTrackCount(book())).toBe(0)
  })

  it('returns 0 for null/undefined media and for podcasts', () => {
    expect(getBookTrackCount(null)).toBe(0)
    expect(getBookTrackCount(undefined)).toBe(0)
    expect(getBookTrackCount({ mediaType: 'podcast', metadata: {} } as never)).toBe(0)
  })
})

describe('isLibraryItemPlayable', () => {
  it('is true for a detail-payload book with tracks', () => {
    const media = book({ audioFiles: [{ index: 0 }] as never })
    expect(isLibraryItemPlayable(item(media))).toBe(true)
  })

  it('is true for a shelf-payload book (numTracks only) — the regression that hid Play', () => {
    expect(isLibraryItemPlayable(item(book({ numTracks: 12 })))).toBe(true)
  })

  it('is false when the backend flagged the item as missing', () => {
    const media = book({ numTracks: 5 })
    expect(isLibraryItemPlayable(item(media, { isMissing: true }))).toBe(false)
  })

  it('is false when the backend flagged the item as invalid', () => {
    const media = book({ numTracks: 5 })
    expect(isLibraryItemPlayable(item(media, { isInvalid: true }))).toBe(false)
  })

  it('is false for a book with no track evidence at all', () => {
    expect(isLibraryItemPlayable(item(book()))).toBe(false)
  })

  it('is true for a podcast with episodes', () => {
    const podcast = { mediaType: 'podcast', metadata: { title: 'Pod' }, episodes: [{ id: 'e1' }] }
    expect(isLibraryItemPlayable(item(podcast as never))).toBe(true)
  })

  it('is true for a book that only has a recentEpisode to resume', () => {
    const li = item(book(), { recentEpisode: { id: 'e1' } })
    expect(isLibraryItemPlayable(li)).toBe(true)
  })
})

/**
 * ── REGRESSION: the missing mediaType discriminant ──
 *
 * `mapBookForMobile` set `mediaType` on the parent item but never inside
 * `media`, so on every shelf payload `media.mediaType` was undefined. The
 * original guard was `media.mediaType === 'book'`, which therefore returned
 * false for every book and misclassified the entire library as podcasts.
 *
 * The blast radius was silent: playability fell through to the podcast branch
 * (which only counts `episodes`), so Play never rendered despite a correct
 * `numTracks`; the Read button, gated on the same guard, never rendered either.
 *
 * These tests pin the behaviour at both layers, because either one alone would
 * leave the app one bad deploy away from a library with no Play buttons.
 */
describe('isBookMedia discriminant', () => {
  it('trusts an explicit mediaType when the API sends one', () => {
    expect(isBookMedia({ mediaType: 'book' } as BookMedia)).toBe(true)
    expect(isBookMedia({ mediaType: 'podcast', episodes: [] } as never)).toBe(false)
  })

  it('infers a book when mediaType is absent but the payload is book-shaped', () => {
    // Exactly the shelf shape: numTracks present, no mediaType.
    expect(isBookMedia({ numTracks: 8 } as unknown as BookMedia)).toBe(true)
    expect(isBookMedia({ audioFiles: [] } as unknown as BookMedia)).toBe(true)
    expect(isBookMedia({ chapters: [] } as unknown as BookMedia)).toBe(true)
    expect(isBookMedia({ ebookFormat: 'epub' } as unknown as BookMedia)).toBe(true)
  })

  it('still identifies a podcast from its episodes array', () => {
    expect(isBookMedia({ episodes: [{ id: 'e1' }] } as never)).toBe(false)
    expect(isPodcastMedia({ episodes: [{ id: 'e1' }] } as never)).toBe(true)
  })

  it('a bare empty object is treated as a book, not a podcast', () => {
    // Fails toward the branch that degrades gracefully: a book with no track
    // evidence renders no Play (correct), whereas misreading it as a podcast
    // would also hide it, but the reverse error -- calling a real book a
    // podcast -- is what silently disabled every affordance.
    expect(isBookMedia({} as BookMedia)).toBe(true)
  })
})

describe('shelf payload with no mediaType is still playable', () => {
  it('the numTracks-only shelf shape is playable (the exact production bug)', () => {
    // This is what the shelf actually returned: mediaType missing, numTracks
    // correct, nothing else. It must be playable or no shelf card shows Play.
    const shelfMedia = { numTracks: 27 } as BookMedia
    expect(isBookMedia(shelfMedia)).toBe(true)
    expect(getBookTrackCount(shelfMedia)).toBe(27)
    expect(isLibraryItemPlayable(item(shelfMedia))).toBe(true)
  })

  it('a podcast shape without mediaType is not playable as a book', () => {
    const podcastMedia = { episodes: [] } as never
    expect(getBookTrackCount(podcastMedia)).toBe(0)
    expect(isLibraryItemPlayable(item(podcastMedia))).toBe(false)
  })
})
