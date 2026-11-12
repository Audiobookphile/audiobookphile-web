'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/shared/utils/supabase/client'
import type { BookLibraryItem, MediaItemShare, PodcastEpisodeDownload, PodcastLibraryItem, RssFeed } from '@/types/api'

interface UseItemPageSocketOptions {
  libraryItemId: string
  mediaId?: string
  isPodcast: boolean
  onItemUpdated?: (libraryItem: BookLibraryItem | PodcastLibraryItem) => void
  initialRssFeed?: RssFeed | null
}

interface UseItemPageSocketReturn {
  rssFeed: RssFeed | null
  mediaItemShare: MediaItemShare | null
  episodesDownloading: PodcastEpisodeDownload[]
  episodeDownloadsQueued: PodcastEpisodeDownload[]
}

export function useItemPageSocket({
  libraryItemId,
  onItemUpdated,
  initialRssFeed = null,
}: UseItemPageSocketOptions): UseItemPageSocketReturn {
  const [rssFeed] = useState<RssFeed | null>(initialRssFeed)

  useEffect(() => {
    if (!libraryItemId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`realtime-item-${libraryItemId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'library_items',
          filter: `id=eq.${libraryItemId}`,
        },
        (payload) => {
          console.log('[Supabase Realtime] Dynamic library_item updated:', payload.new)
          if (onItemUpdated && payload.new) {
            onItemUpdated(payload.new as unknown as BookLibraryItem)
          }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [libraryItemId, onItemUpdated])

  return {
    rssFeed,
    mediaItemShare: null,
    episodesDownloading: [],
    episodeDownloadsQueued: [],
  }
}
