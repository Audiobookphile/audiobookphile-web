'use client'

import { useCallback, useState, useTransition } from 'react'
import { getExpandedLibraryItemAction } from '@/features/player/actions/mediaActions'
import { type PlayerQueueItem, useMediaContext } from '@/features/player/contexts/MediaContext'
import type { PlayerHandlerControls } from '@/features/player/hooks/usePlayerHandler'
import { useGlobalToast } from '@/shared/contexts/ToastContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import type { BookMedia, BookMetadata, LibraryItem, PodcastEpisode } from '@/types/api'
import { isPodcastLibraryItem } from '@/types/api'

interface UsePlayLibraryItemParams {
  libraryItem: LibraryItem
  episode?: PodcastEpisode | null
  playerControls: PlayerHandlerControls
}

export interface PlayLibraryItemResult {
  processing: boolean
  play: () => void
}

/**
 * Builds the queue entry the "now playing" / queue panel renders for an item.
 * Extracted so the cover overlay, the action button bar and the media card
 * all describe the same item identically -- a drifted queue entry is what
 * makes the player show the wrong title after starting playback.
 */
function buildQueueItem(libraryItem: LibraryItem, episode: PodcastEpisode | null | undefined): PlayerQueueItem {
  const media = libraryItem.media
  const isPodcast = isPodcastLibraryItem(libraryItem)
  const bookMetadata = isPodcast ? null : (media?.metadata as BookMetadata | undefined)
  const title = isPodcast ? (media?.metadata?.title ?? '') : (bookMetadata?.title ?? '')
  const author = isPodcast ? (media?.metadata?.author ?? '') : (bookMetadata?.authorName ?? '')
  // Only books carry a runtime; PodcastMedia has no `duration` field.
  const mediaDuration = isPodcast ? null : ((media as BookMedia | undefined)?.duration ?? null)

  return {
    libraryItemId: libraryItem.id,
    libraryId: libraryItem.libraryId,
    episodeId: episode?.id ?? null,
    title: episode ? episode.title : title,
    subtitle: episode ? title : author || '',
    caption: '',
    duration: episode ? (episode.audioFile?.duration ?? null) : mediaDuration,
    coverPath: media?.coverPath ?? null,
  }
}

/**
 * Single entry point for "start playing this item".
 *
 * Playback needs the *expanded* item (detail endpoint) because the shelf
 * projection deliberately omits `audio_files` — handing a list-mode payload
 * to the player yields a zero-track queue that starts and immediately stops.
 * This hook owns that fetch, the streaming check (so tapping a playing item
 * toggles pause instead of restarting), and error reporting, so every play
 * button in the app behaves identically.
 */
export function usePlayLibraryItem({
  libraryItem,
  episode = null,
  playerControls,
}: UsePlayLibraryItemParams): PlayLibraryItemResult {
  const t = useTypeSafeTranslations()
  const { showToast } = useGlobalToast()
  const { playItem, isStreaming } = useMediaContext()
  const [isPending, startTransition] = useTransition()
  const [fetching, setFetching] = useState(false)

  const play = useCallback(() => {
    // Already the active stream -> this button is a play/pause toggle.
    if (isStreaming(libraryItem.id, episode?.id ?? null)) {
      playerControls.playPause()
      return
    }

    startTransition(async () => {
      setFetching(true)
      try {
        const fullLibraryItem = (await getExpandedLibraryItemAction(libraryItem.id)) as LibraryItem | null

        if (!fullLibraryItem) {
          throw new Error(`Library item ${libraryItem.id} expanded to null`)
        }

        await playItem({
          libraryItem: fullLibraryItem,
          episodeId: episode?.id ?? null,
          queueItems: [buildQueueItem(fullLibraryItem, episode)],
        })
      } catch (error) {
        console.error('Failed to start playback', error)
        showToast(t('ToastFailedToLoadData'), { type: 'error' })
      } finally {
        setFetching(false)
      }
    })
  }, [episode, isStreaming, libraryItem.id, playItem, playerControls, showToast, t])

  return { processing: fetching || isPending, play }
}
