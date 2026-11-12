import type { BookMedia, LibraryItem, PodcastMedia } from '@/types/api'
import { isBookMedia } from '@/types/api/functions'

/**
 * Playability of a library item, derived from the media payload.
 *
 * The API exposes track information in three different shapes depending on
 * which endpoint served the payload, and historically each call site picked a
 * different one:
 *
 *   - detail endpoint  -> `audioFiles` (full array) and `numTracks`
 *   - shelf / list     -> neither (the projection omits the multi-megabyte
 *                        `audio_files` column) — only `numTracks`, read from
 *                        the trigger-maintained `num_tracks` counter
 *   - `tracks`         -> **never emitted by the API at all**; it only ever
 *                        existed in the web's own DB mapper. Reading it
 *                        therefore always yielded `undefined`, and every
 *                        `tracks.length > 0` guard silently evaluated false,
 *                        which is why Play was hidden for playable books and
 *                        why the detail page's cover overlay shipped a
 *                        Play button wired to an empty handler.
 *
 * Everything that needs to ask "can this play?" goes through
 * `getBookTrackCount` / `isLibraryItemPlayable` so that shape drift can never
 * reappear as a hidden button.
 */

/**
 * Number of audio tracks for a book, across all payload shapes.
 *
 * Order matters: the concrete array wins over the denormalised counter so a
 * stale `numTracks` can never mask a populated `audioFiles`. `duration` is
 * used only as a last-resort signal -- a book with a known runtime was
 * scanned from real media, so it is playable even if its track array was
 * dropped by an older writer that predates the `num_tracks` column.
 */
export function getBookTrackCount(media: BookMedia | PodcastMedia | null | undefined): number {
  if (!media || !isBookMedia(media)) return 0

  if (media.audioFiles?.length) return media.audioFiles.length
  if (typeof media.numTracks === 'number' && media.numTracks > 0) return media.numTracks
  if (typeof media.numAudioFiles === 'number' && media.numAudioFiles > 0) return media.numAudioFiles
  if (media.duration && media.duration > 0) return 1

  return 0
}

/**
 * Whether the UI should offer a Play affordance for this item.
 *
 * `isMissing`/`isInvalid` are authoritative: the backend flags an item whose
 * directory or media has vanished, and offering Play on those produces a dead
 * button. Podcast episodes are counted separately because podcasts are played
 * per-episode rather than as a single track list.
 */
export function isLibraryItemPlayable(
  libraryItem: Pick<LibraryItem, 'media' | 'isMissing' | 'isInvalid' | 'recentEpisode'>,
  options: { episode?: { id: string } | null } = {}
): boolean {
  if (libraryItem.isMissing || libraryItem.isInvalid) return false

  const media = libraryItem.media
  if (media && !isBookMedia(media)) {
    return media.episodes?.length ? true : !!libraryItem.recentEpisode
  }

  if (getBookTrackCount(media) > 0) return true
  if (options.episode) return true

  return !!libraryItem.recentEpisode
}
