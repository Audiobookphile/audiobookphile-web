import { secondsToTimestamp } from '@/shared/lib/datefns'
import type { BookLibraryItem, PodcastLibraryItem } from '@/types/api'

export function formatBookMetadataMarkdown(libraryItem: BookLibraryItem | PodcastLibraryItem): string {
  const meta = libraryItem.media?.metadata
  const title = meta?.title || 'Unknown Title'
  const authors = meta && 'authors' in meta ? (meta.authors || []).map((a) => a.name).join(', ') : ''
  const narrators = meta && 'narrators' in meta ? (meta.narrators || []).join(', ') : ''
  const series =
    meta && 'series' in meta
      ? (meta.series || []).map((s) => `${s.name}${s.sequence ? ` #${s.sequence}` : ''}`).join(', ')
      : ''
  const duration =
    libraryItem.media && 'duration' in libraryItem.media && libraryItem.media.duration
      ? secondsToTimestamp(libraryItem.media.duration)
      : ''
  const genres = meta && 'genres' in meta ? (meta.genres || []).join(', ') : ''
  const publishedYear = meta && 'publishedYear' in meta ? meta.publishedYear : ''
  const description = meta?.description || ''

  const lines: string[] = [
    `# ${title}`,
    '',
    authors ? `**Author:** ${authors}` : null,
    narrators ? `**Narrator:** ${narrators}` : null,
    series ? `**Series:** ${series}` : null,
    duration ? `**Duration:** ${duration}` : null,
    publishedYear ? `**Published:** ${publishedYear}` : null,
    genres ? `**Genres:** ${genres}` : null,
  ].filter(Boolean) as string[]

  if (description) {
    lines.push('', '## Description', '', description)
  }

  return lines.join('\n')
}
