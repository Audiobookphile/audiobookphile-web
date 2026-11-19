import { describe, expect, it } from 'bun:test'
import { formatBookMetadataMarkdown } from '@/shared/lib/metadataMarkdown'
import type { BookLibraryItem } from '@/types/api'

describe('formatBookMetadataMarkdown', () => {
  it('formats full book metadata into structured Markdown', () => {
    const item = {
      id: 'item-1',
      mediaType: 'book',
      libraryId: 'lib-1',
      media: {
        id: 'm-1',
        duration: 3665,
        metadata: {
          title: 'Project Hail Mary',
          authors: [{ id: 'a1', name: 'Andy Weir' }],
          narrators: ['Ray Porter'],
          series: [{ id: 's1', name: 'Standalone', sequence: '1' }],
          genres: ['Sci-Fi', 'Space Exploration'],
          publishedYear: '2021',
          description: 'A lone astronaut must save the earth.',
        },
      },
    } as unknown as BookLibraryItem

    const md = formatBookMetadataMarkdown(item)

    expect(md).toContain('# Project Hail Mary')
    expect(md).toContain('**Author:** Andy Weir')
    expect(md).toContain('**Narrator:** Ray Porter')
    expect(md).toContain('**Series:** Standalone #1')
    expect(md).toContain('**Duration:** 01:01:05')
    expect(md).toContain('**Published:** 2021')
    expect(md).toContain('**Genres:** Sci-Fi, Space Exploration')
    expect(md).toContain('## Description')
    expect(md).toContain('A lone astronaut must save the earth.')
  })

  it('handles books with minimal metadata gracefully', () => {
    const item = {
      id: 'item-2',
      mediaType: 'book',
      libraryId: 'lib-1',
      media: {
        id: 'm-2',
        metadata: {
          title: 'Minimal Book',
        },
      },
    } as unknown as BookLibraryItem

    const md = formatBookMetadataMarkdown(item)

    expect(md).toBe('# Minimal Book')
    expect(md).not.toContain('**Author:**')
    expect(md).not.toContain('## Description')
  })
})
