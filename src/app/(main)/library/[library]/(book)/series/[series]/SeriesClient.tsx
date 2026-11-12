'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useLibrary } from '@/features/library/contexts/LibraryContext'
import { useSocketEvent } from '@/shared/contexts/SocketContext'
import { useUser } from '@/shared/contexts/UserContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import RssFeedOpenCloseModal from '@/shared/modals/RssFeedOpenCloseModal'
import BookMediaCard from '@/shared/widgets/media-card/BookMediaCard'
import { BookshelfView, GetLibraryItemsResponse, RssFeed, Series } from '@/types/api'

interface SeriesClientProps {
  series: Series
  libraryItems: GetLibraryItemsResponse
}

export default function SeriesClient({ series, libraryItems }: SeriesClientProps) {
  const router = useRouter()
  const t = useTypeSafeTranslations()
  const { user, serverSettings, ereaderDevices, getMediaItemProgress, userIsAdminOrUp } = useUser()
  const { setItemCount, setDetailToolbarTitle, setContextMenuItems, setContextMenuActionHandler } = useLibrary()

  const results = Array.isArray(libraryItems?.results) ? libraryItems.results : []
  const bookTotal = libraryItems?.total ?? results.length

  const [rssFeed, setRssFeed] = useState<RssFeed | null>(series.rssFeed ?? null)
  const [rssFeedModalOpen, setRssFeedModalOpen] = useState(false)

  useEffect(() => {
    setRssFeed(series.rssFeed ?? null)
  }, [series.rssFeed])

  const handleRssFeedOpen = useCallback(
    (data: RssFeed) => {
      if (data.entityId === series.id) setRssFeed(data)
    },
    [series.id]
  )

  const handleRssFeedClosed = useCallback(
    (data: RssFeed) => {
      if (data.entityId === series.id) setRssFeed(null)
    },
    [series.id]
  )

  useSocketEvent<RssFeed>('rss_feed_open', handleRssFeedOpen, [series.id])
  useSocketEvent<RssFeed>('rss_feed_closed', handleRssFeedClosed, [series.id])

  useLayoutEffect(() => {
    setDetailToolbarTitle(series.name)
    setItemCount(bookTotal)

    return () => {
      setDetailToolbarTitle(null)
      setItemCount(null)
      setContextMenuItems([])
    }
  }, [bookTotal, series.name, setContextMenuItems, setDetailToolbarTitle, setItemCount])

  const openRssModal = useCallback(() => {
    setRssFeedModalOpen(true)
  }, [])

  const handleToolbarMenuAction = useCallback(
    (action: string) => {
      if (action === 'openRssFeed') openRssModal()
    },
    [openRssModal]
  )

  useEffect(() => {
    if (!userIsAdminOrUp && !rssFeed) {
      setContextMenuItems([])
      return
    }
    setContextMenuItems([{ text: t('LabelOpenRSSFeed'), action: 'openRssFeed' }])
  }, [rssFeed, setContextMenuItems, t, userIsAdminOrUp])

  useEffect(() => {
    setContextMenuActionHandler(handleToolbarMenuAction)
    return () => setContextMenuActionHandler(() => {})
  }, [handleToolbarMenuAction, setContextMenuActionHandler])

  const rssModalEntity = useMemo(
    () => ({
      id: series.id,
      name: series.name,
      type: 'series' as const,
      feed: rssFeed,
    }),
    [rssFeed, series.id, series.name]
  )

  return (
    <div>
      <div className="flex flex-wrap gap-4">
        {results.map((libraryItem) => {
          const entityProgress = libraryItem.media?.id ? getMediaItemProgress(libraryItem.media.id) : undefined
          return (
            <BookMediaCard
              key={libraryItem.id}
              libraryItem={libraryItem}
              bookshelfView={BookshelfView.DETAIL}
              dateFormat={serverSettings.dateFormat ?? 'MM/dd/yyyy'}
              timeFormat={serverSettings.timeFormat ?? 'HH:mm'}
              userPermissions={user.permissions}
              ereaderDevices={ereaderDevices}
              showSubtitles={true}
              mediaProgress={entityProgress}
            />
          )
        })}
      </div>

      <RssFeedOpenCloseModal
        isOpen={rssFeedModalOpen}
        onClose={() => setRssFeedModalOpen(false)}
        entity={rssModalEntity}
        onFeedChange={(feed) => {
          setRssFeed(feed)
          router.refresh()
        }}
      />
    </div>
  )
}
