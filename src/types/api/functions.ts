import { LibraryItem } from '.'
import { BookLibraryItem, BookMedia, BookMetadata, PodcastLibraryItem, PodcastMedia, PodcastMetadata } from './models'

/**
 * Narrows a media payload to a book.
 *
 * ── WHY THIS IS NOT JUST `media.mediaType === 'book'` ──
 * The API contract declares `BookMedia.mediaType` as required, and this guard
 * is the only thing in the app that narrows on it. But the shelf mapper
 * (`mapBookForMobile`) only ever set `mediaType` on the *parent item*, never
 * inside `media` -- so on every list payload `media.mediaType` was undefined,
 * this returned false, and **every book was misclassified as a podcast**.
 *
 * The failure was silent and total: the playability check fell through to the
 * podcast branch, which only counts `episodes`, so Play never rendered even
 * though the payload carried a correct `numTracks`. The Read button, also gated
 * on this guard, never rendered either.
 *
 * So this now trusts the discriminant when present, and otherwise infers from
 * the shape. The asymmetry is deliberate: a book has several independent
 * fallbacks (numTracks, audioFiles, duration) while a podcast has exactly one
 * (episodes). When the discriminant is missing we therefore fail *toward* book,
 * because that branch degrades gracefully and the podcast branch cannot.
 */
export function isBookMedia(media: BookMedia | PodcastMedia): media is BookMedia {
  if (!media) return false
  if (media.mediaType === 'podcast') return false
  if (media.mediaType === 'book') return true
  // Discriminant absent: infer. A podcast is only ever a list of episodes, so
  // an `episodes` array with no book-shaped fields is a podcast; everything
  // else is a book.
  const looksPodcast = Array.isArray((media as PodcastMedia).episodes)
  const looksBook =
    typeof (media as BookMedia).numTracks === 'number' ||
    Array.isArray((media as BookMedia).audioFiles) ||
    Array.isArray((media as BookMedia).chapters) ||
    typeof (media as BookMedia).ebookFormat === 'string'
  if (looksPodcast && !looksBook) return false
  return true
}

export function isPodcastMedia(media: BookMedia | PodcastMedia): media is PodcastMedia {
  // Exact inverse of isBookMedia. These two guards are used together all over
  // the app, so allowing them to disagree (both false, because one infers and
  // the other does not) silently drops media into no branch at all.
  return !isBookMedia(media)
}

export function isBookMetadata(metadata: BookMetadata | PodcastMetadata): metadata is BookMetadata {
  return 'authors' in metadata || 'authorName' in metadata
}

export function isPodcastMetadata(metadata: BookMetadata | PodcastMetadata): metadata is PodcastMetadata {
  return 'author' in metadata && !('authors' in metadata)
}

export function isBookLibraryItem(item: LibraryItem): item is BookLibraryItem {
  return item.mediaType === 'book'
}

export function isPodcastLibraryItem(item: LibraryItem): item is PodcastLibraryItem {
  return item.mediaType === 'podcast'
}
