/**
 * Type-system invariant tests
 *
 * Covers the property tests originally specified as optional in
 * .kiro/specs/type-system-improvements/tasks.md (tasks 1.2, 3.2, 5.3–5.6,
 * 6.3–6.5, 7.2–7.3).
 *
 * Uses bun:test with representative fixed inputs instead of fast-check
 * arbitrary generation — same invariants, zero new dependencies.
 */

import { describe, expect, it } from 'bun:test'
import { mapLibrary, mapLibraryItem, mapLibrarySettings } from '../shared/utils/mappers'
import type { MobileBookInput, MobileLibraryInput, MobileProgressInput } from '../shared/utils/mobileMappers'
import { mapBookForMobile, mapLibraryForMobile } from '../shared/utils/mobileMappers'
import { isBookMedia, isPodcastMedia } from '../types/api/functions'
import type { BookMedia, PodcastMedia } from '../types/api/models'
import {
  AudioFileSchema,
  BookMetadataSchema,
  LibraryFileSchema,
  MobileBookSchema,
  MobileLibrarySchema,
} from '../types/schemas'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeBookMedia(overrides?: Partial<BookMedia>): BookMedia {
  return {
    mediaType: 'book',
    tags: [],
    metadata: {
      title: 'Test Book',
      authors: [],
      narrators: [],
      series: [],
      genres: [],
      explicit: false,
    },
    ...overrides,
  }
}

function makePodcastMedia(overrides?: Partial<PodcastMedia>): PodcastMedia {
  return {
    mediaType: 'podcast',
    tags: [],
    metadata: { title: 'Test Podcast', genres: [], explicit: false },
    ...overrides,
  }
}

// ─── Property 7: BookMedia / PodcastMedia discriminant invariant ──────────────

describe('discriminant invariant (Property 7)', () => {
  it('BookMedia always has mediaType === "book"', () => {
    const samples: BookMedia[] = [
      makeBookMedia(),
      makeBookMedia({ duration: 3600 }),
      makeBookMedia({ coverPath: '/cover.jpg' }),
    ]
    for (const m of samples) expect(m.mediaType).toBe('book')
  })

  it('PodcastMedia always has mediaType === "podcast"', () => {
    const samples: PodcastMedia[] = [makePodcastMedia(), makePodcastMedia({ numEpisodes: 5 })]
    for (const m of samples) expect(m.mediaType).toBe('podcast')
  })
})

// ─── Property 8: Type guard discriminant correctness ─────────────────────────

describe('type guard correctness (Property 8)', () => {
  const books: BookMedia[] = [makeBookMedia(), makeBookMedia({ duration: 100 })]
  const podcasts: PodcastMedia[] = [makePodcastMedia(), makePodcastMedia({ numEpisodes: 3 })]
  const all: (BookMedia | PodcastMedia)[] = [...books, ...podcasts]

  it('isBookMedia returns true iff mediaType === "book"', () => {
    for (const m of all) {
      expect(isBookMedia(m)).toBe(m.mediaType === 'book')
    }
  })

  it('isPodcastMedia returns true iff mediaType === "podcast"', () => {
    for (const m of all) {
      expect(isPodcastMedia(m)).toBe(m.mediaType === 'podcast')
    }
  })

  it('exactly one guard returns true for any media object', () => {
    for (const m of all) {
      const trueCount = [isBookMedia(m), isPodcastMedia(m)].filter(Boolean).length
      expect(trueCount).toBe(1)
    }
  })
})

// ─── Property 9: AudioFileSchema validation round-trip ───────────────────────

describe('AudioFileSchema round-trip (Property 9)', () => {
  const cases = [
    {
      id: 'f1',
      index: 0,
      ino: 'ino1',
      metadata: { filename: 'track1.mp3' },
      mimeType: 'audio/mpeg',
    },
    {
      id: 'f2',
      index: 1,
      ino: 'ino2',
      metadata: {},
      mimeType: 'audio/mp4',
      addedAt: 1700000000,
      updatedAt: 1700000001,
    },
    {
      id: 'f3',
      index: 2,
      ino: 'ino3',
      metadata: { size: 1024, duration: 3600 },
      mimeType: 'audio/flac',
      duration: 3600,
    },
  ]

  it('parses all valid AudioFile shapes successfully', () => {
    for (const input of cases) {
      const result = AudioFileSchema.safeParse(input)
      expect(result.success).toBe(true)
    }
  })

  it('preserves addedAt and updatedAt when provided', () => {
    const result = AudioFileSchema.safeParse(cases[1])
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.addedAt).toBe(1700000000)
      expect(result.data.updatedAt).toBe(1700000001)
    }
  })

  it('rejects when required fields are missing', () => {
    expect(AudioFileSchema.safeParse({ index: 0 }).success).toBe(false)
  })
})

// ─── Property 10: LibraryFileSchema validation round-trip ────────────────────

describe('LibraryFileSchema round-trip (Property 10)', () => {
  const cases = [
    { ino: 'ino1' },
    {
      ino: 'ino2',
      id: 'lf1',
      fileType: 'audio',
      addedAt: 1700000000,
      updatedAt: 1700000001,
    },
    {
      ino: 'ino3',
      metadata: { filename: 'book.mp3', size: 2048 },
      isSupplementary: false,
    },
  ]

  it('parses all valid LibraryFile shapes successfully', () => {
    for (const input of cases) {
      const result = LibraryFileSchema.safeParse(input)
      expect(result.success).toBe(true)
    }
  })

  it('preserves addedAt and updatedAt when provided', () => {
    const result = LibraryFileSchema.safeParse(cases[1])
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.addedAt).toBe(1700000000)
      expect(result.data.updatedAt).toBe(1700000001)
    }
  })

  it('rejects when ino is missing', () => {
    expect(LibraryFileSchema.safeParse({ id: 'x' }).success).toBe(false)
  })
})

// ─── Property 6: BookMetadataFlat parse round-trip ───────────────────────────

describe('BookMetadataFlat parse round-trip (Property 6)', () => {
  const cases = [
    { title: 'Dune', genres: [], explicit: false },
    {
      title: 'Foundation',
      genres: ['Science Fiction'],
      explicit: false,
      authorName: 'Isaac Asimov',
      publishedYear: '1951',
    },
    {
      title: '1984',
      genres: ['Dystopia', 'Fiction'],
      explicit: true,
      abridged: false,
      isbn: '978-0451524935',
      language: 'en',
    },
  ]

  it('round-trips all valid metadata objects through BookMetadataSchema', () => {
    for (const input of cases) {
      const result = BookMetadataSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.title).toBe(input.title)
        expect(result.data.genres).toEqual(input.genres)
        expect(result.data.explicit).toBe(input.explicit)
      }
    }
  })

  it('rejects when title is missing', () => {
    expect(BookMetadataSchema.safeParse({ genres: [], explicit: false }).success).toBe(false)
  })
})

// ─── Property 1: mapLibrary row mapping invariant ────────────────────────────

describe('mapLibrary row mapping invariant (Property 1)', () => {
  const minimalRow = {
    id: 'lib1',
    name: 'My Library',
    created_at: '2024-01-01T00:00:00Z',
  } as unknown as Parameters<typeof mapLibrary>[0]
  const fullRow = {
    id: 'lib2',
    name: 'Full Library',
    media_type: 'book',
    display_order: 3,
    icon: 'bookshelf',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-01T00:00:00Z',
    settings: null,
    library_folders: [
      {
        id: 'f1',
        library_id: 'lib2',
        path: '/books',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ],
  } as unknown as Parameters<typeof mapLibrary>[0]

  it('always returns id, name, mediaType, createdAt, updatedAt', () => {
    for (const row of [minimalRow, fullRow]) {
      const lib = mapLibrary(row)
      expect(lib.id).toBe(row.id)
      expect(typeof lib.name).toBe('string')
      expect(lib.mediaType).toBeDefined()
      expect(typeof lib.createdAt).toBe('number')
      expect(typeof lib.updatedAt).toBe('number')
    }
  })

  it('maps folders array correctly', () => {
    const lib = mapLibrary(fullRow)
    expect(Array.isArray(lib.folders)).toBe(true)
    expect(lib.folders?.[0].id).toBe('f1')
  })
})

// ─── Property 2: mapLibraryItem row mapping invariant ────────────────────────

describe('mapLibraryItem row mapping invariant (Property 2)', () => {
  const baseItem = {
    id: 'item1',
    library_id: 'lib1',
    ino: 'ino1',
    path: '/books/dune',
    rel_path: 'dune',
    is_file: false,
    is_missing: false,
    is_invalid: false,
    media_type: 'book',
    title: 'Dune',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-01T00:00:00Z',
    mtime: null,
    ctime: null,
    birthtime: null,
    last_scan: null,
    audio_files: [],
    book_authors: [],
    book_series: [],
  } as unknown as Parameters<typeof mapLibraryItem>[0]

  it('always returns all required LibraryItem fields with correct types', () => {
    const item = mapLibraryItem(baseItem)
    expect(item.id).toBe('item1')
    expect(item.libraryId).toBe('lib1')
    expect(item.mediaType).toBe('book')
    expect(typeof item.addedAt).toBe('number')
    expect(typeof item.updatedAt).toBe('number')
    expect(typeof item.isMissing).toBe('boolean')
    expect(typeof item.isInvalid).toBe('boolean')
    expect(item.media).toBeDefined()
    expect(item.media.mediaType).toBe('book')
  })
})

// ─── Property 3: mapLibrarySettings null-safety invariant ────────────────────

describe('mapLibrarySettings null-safety invariant (Property 3)', () => {
  const inputs = [
    null,
    undefined,
    {},
    { cover_aspect_ratio: 0, disable_watcher: true },
    {
      coverAspectRatio: 1,
      disableWatcher: false,
      auto_scan_cron_expression: '0 * * * *',
    },
  ]

  it('always defines coverAspectRatio and disableWatcher regardless of input', () => {
    for (const input of inputs) {
      const settings = mapLibrarySettings(input as unknown as Parameters<typeof mapLibrarySettings>[0])
      expect(settings.coverAspectRatio).toBeDefined()
      expect(typeof settings.disableWatcher).toBe('boolean')
    }
  })
})

// ─── Property 4: MobileLibraryInput → MobileLibraryModel ─────────────────────

describe('MobileLibraryInput → MobileLibraryModel (Property 4)', () => {
  const inputs: MobileLibraryInput[] = [
    { id: 'lib1', name: 'Books', created_at: '2024-01-01T00:00:00Z' },
    {
      id: 'lib2',
      name: 'Podcasts',
      media_type: 'podcast',
      display_order: 2,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-06-01T00:00:00Z',
      settings: { coverAspectRatio: 1, disableWatcher: false },
      library_folders: [
        {
          id: 'f1',
          library_id: 'lib2',
          path: '/podcasts',
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
    },
  ]

  it('output always parses through MobileLibrarySchema', () => {
    for (const input of inputs) {
      const output = mapLibraryForMobile(input)
      const result = MobileLibrarySchema.safeParse(output)
      expect(result.success).toBe(true)
    }
  })
})

// ─── Property 5: MobileBookInput → MobileBookModel ───────────────────────────

describe('MobileBookInput → MobileBookModel (Property 5)', () => {
  const makeBook = (title: string): MobileBookInput => ({
    id: `item-${title.toLowerCase().replace(/\s/g, '-')}`,
    library_id: 'lib1',
    title,
    media_type: 'book',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-01T00:00:00Z',
    books: {
      title,
      genres: ['Fiction'],
      explicit: false,
      duration: 3600,
      audio_files: [],
      chapters: [],
    },
  })

  const makeProgress = (): MobileProgressInput => ({
    id: 'prog1',
    duration: 3600,
    progress: 0.5,
    current_time_pos: 1800,
    is_finished: false,
    last_update: '2024-06-01T00:00:00Z',
  })

  const cases: Array<[MobileBookInput, MobileProgressInput | null]> = [
    [makeBook('Dune'), null],
    [makeBook('Foundation'), makeProgress()],
    [makeBook('1984'), null],
  ]

  it('output always parses through MobileBookSchema', () => {
    for (const [bookInput, progressInput] of cases) {
      const output = mapBookForMobile(bookInput, progressInput)
      const result = MobileBookSchema.safeParse(output)
      expect(result.success).toBe(true)
    }
  })

  it('output media.metadata always parses through BookMetadataSchema', () => {
    for (const [bookInput, progressInput] of cases) {
      const output = mapBookForMobile(bookInput, progressInput)
      const result = BookMetadataSchema.safeParse(output.media.metadata)
      expect(result.success).toBe(true)
    }
  })
})
