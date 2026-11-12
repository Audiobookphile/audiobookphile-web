'use client'

import { LayoutGrid, List } from 'lucide-react'
import { useCallback, useEffect, useState, useTransition } from 'react'
import BookShelfGrid from '@/features/library/components/BookShelfGrid'
import BookShelfRow from '@/features/library/components/BookShelfRow'
import { useCardSize } from '@/features/library/contexts/CardSizeContext'
import { useLibrary } from '@/features/library/contexts/LibraryContext'
import { useSocketEvent } from '@/shared/contexts/SocketContext'
import { useUser } from '@/shared/contexts/UserContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { normalizeShelves, shelfEntities } from '@/shared/lib/library-shelves'
import IconBtn from '@/shared/ui/IconBtn'
import Tooltip from '@/shared/ui/Tooltip'
import ItemSlider from '@/shared/widgets/ItemSlider'
import { AuthorCard } from '@/shared/widgets/media-card/AuthorCard'
import BookMediaCard from '@/shared/widgets/media-card/BookMediaCard'
import PodcastEpisodeCard from '@/shared/widgets/media-card/PodcastEpisodeCard'
import PodcastMediaCard from '@/shared/widgets/media-card/PodcastMediaCard'
import { SeriesCard } from '@/shared/widgets/media-card/SeriesCard'
import {
  Author,
  BookshelfView,
  LibraryItem,
  MediaItemShare,
  MediaProgress,
  PersonalizedShelf,
  PersonalizedShelfType,
  RssFeed,
  Series,
} from '@/types/api'
import { requestScanLibrary } from '../../settings/libraries/actions'
import LibraryEmptyState from './LibraryEmptyState'

interface LibraryClientProps {
  personalized: PersonalizedShelf[]
}

export default function LibraryClient({ personalized }: LibraryClientProps) {
  const t = useTypeSafeTranslations()
  const [, startScanTransition] = useTransition()
  const { sizeMultiplier } = useCardSize()
  const { user, serverSettings, ereaderDevices, userIsAdminOrUp, getMediaItemProgress } = useUser()
  const { library, setContextMenuItems, setContextMenuActionHandler, homeBookshelfView } = useLibrary()

  const [shelves, setShelves] = useState<PersonalizedShelf[]>(() => normalizeShelves(personalized))
  const [localViewMode, setLocalViewMode] = useState<'row' | 'grid'>('row')

  useEffect(() => {
    setShelves(normalizeShelves(personalized))
  }, [personalized])

  /**
   * Updates entities within shelves of matching types.
   * Only triggers a re-render if the updater returns a new reference for at least one entity.
   * @param shelfTypes - Shelf types to apply the update to.
   * @param updater - Called for each entity; must return the same reference if unchanged.
   */
  const updateShelfEntities = useCallback(
    (
      shelfTypes: PersonalizedShelfType[],
      updater: (entity: LibraryItem | Series | Author) => LibraryItem | Series | Author
    ) => {
      setShelves((prev) => {
        if (!Array.isArray(prev)) return normalizeShelves(prev)
        let shelvesChanged = false
        const nextShelves = prev.map((shelf) => {
          if (!shelfTypes.includes(shelf.type)) return shelf

          let changed = false
          const rawEntities = shelfEntities(shelf)
          const nextEntities = (rawEntities as (LibraryItem | Series | Author)[]).map((entity) => {
            const next = updater(entity)
            if (next !== entity) changed = true
            return next
          })

          if (!changed) return shelf
          shelvesChanged = true
          return { ...shelf, entities: nextEntities } as PersonalizedShelf
        })
        return shelvesChanged ? nextShelves : prev
      })
    },
    []
  )

  // Shares only apply to book libraries
  const handleShareOpen = useCallback(
    (mediaItemShare: MediaItemShare) => {
      if (library.mediaType !== 'book') return

      updateShelfEntities(['book'], (entity) => {
        const li = entity as LibraryItem
        if (li.media?.id !== mediaItemShare.mediaItemId) return entity
        return { ...li, mediaItemShare }
      })
    },
    [library.mediaType, updateShelfEntities]
  )

  const handleShareClosed = useCallback(
    (mediaItemShare: MediaItemShare) => {
      if (library.mediaType !== 'book') return

      updateShelfEntities(['book'], (entity) => {
        const li = entity as LibraryItem
        if (li.media?.id !== mediaItemShare.mediaItemId) return entity
        return { ...li, mediaItemShare: undefined }
      })
    },
    [library.mediaType, updateShelfEntities]
  )

  // RSS feeds on home shelves are relevant for books and series
  const handleRssFeedOpen = useCallback(
    (rssFeed: RssFeed) => {
      if (library.mediaType !== 'book') return

      const shelfTypes: PersonalizedShelfType[] =
        rssFeed.entityType === 'libraryItem' ? ['book'] : rssFeed.entityType === 'series' ? ['series'] : []

      updateShelfEntities(shelfTypes, (entity) => {
        if (entity.id !== rssFeed.entityId) return entity
        return { ...entity, rssFeed }
      })
    },
    [library.mediaType, updateShelfEntities]
  )

  const handleRssFeedClosed = useCallback(
    (rssFeed: RssFeed) => {
      if (library.mediaType !== 'book') return

      const shelfTypes: PersonalizedShelfType[] =
        rssFeed.entityType === 'libraryItem' ? ['book'] : rssFeed.entityType === 'series' ? ['series'] : []

      updateShelfEntities(shelfTypes, (entity) => {
        if (entity.id !== rssFeed.entityId) return entity
        return { ...entity, rssFeed: undefined }
      })
    },
    [library.mediaType, updateShelfEntities]
  )

  useSocketEvent<MediaItemShare>('share_open', handleShareOpen)
  useSocketEvent<MediaItemShare>('share_closed', handleShareClosed)
  useSocketEvent<RssFeed>('rss_feed_open', handleRssFeedOpen)
  useSocketEvent<RssFeed>('rss_feed_closed', handleRssFeedClosed)

  useEffect(() => {
    const items = []

    if (userIsAdminOrUp) {
      items.push({
        text: t('ButtonScanLibrary'),
        action: 'scan',
      })
    }

    setContextMenuItems(items)

    setContextMenuActionHandler((action) => {
      if (action === 'scan') {
        startScanTransition(async () => {
          try {
            await requestScanLibrary(library.id)
          } catch (error) {
            console.error('Failed to start library scan', error)
          }
        })
      }
    })

    return () => {
      setContextMenuItems([])
      setContextMenuActionHandler(() => {})
    }
  }, [userIsAdminOrUp, library.id, setContextMenuItems, setContextMenuActionHandler, t, startScanTransition])

  return (
    <div className="pb-20" style={{ fontSize: sizeMultiplier + 'rem' }}>
      {/* Controls Bar */}
      {shelves.length > 0 && (
        <div className="mb-4 flex justify-end px-4e md:px-8e">
          <div className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 p-1">
            <Tooltip text="Row View">
              <IconBtn
                size="small"
                borderless
                className={`rounded-full p-1.5 transition-colors ${localViewMode === 'row' ? 'text-primary-foreground bg-primary' : 'text-foreground-muted hover:text-foreground'}`}
                onClick={() => setLocalViewMode('row')}
                icon={List}
              />
            </Tooltip>
            <Tooltip text="Grid View">
              <IconBtn
                size="small"
                borderless
                className={`rounded-full p-1.5 transition-colors ${localViewMode === 'grid' ? 'text-primary-foreground bg-primary' : 'text-foreground-muted hover:text-foreground'}`}
                onClick={() => setLocalViewMode('grid')}
                icon={LayoutGrid}
              />
            </Tooltip>
          </div>
        </div>
      )}

      {/* empty state with scan button if user is admin or root */}
      {shelves.length === 0 && (
        <div className="py-8">
          <LibraryEmptyState library={library} showScanButton={['admin', 'root'].includes(user.type)} />
        </div>
      )}

      {/* bookshelf rows */}
      {shelves.map((shelf) => {
        const Wrapper =
          localViewMode === 'grid'
            ? BookShelfGrid
            : homeBookshelfView === BookshelfView.STANDARD
              ? BookShelfRow
              : ItemSlider

        const entities = shelfEntities<LibraryItem | Series | Author>(shelf)

        return (
          <Wrapper key={shelf.id} title={shelf.label}>
            {entities.map((entity, entityIndex) => {
              if (shelf.type === 'book' || shelf.type === 'podcast') {
                const EntityMediaCard = shelf.type === 'book' ? BookMediaCard : PodcastMediaCard
                const libraryItem = entity as LibraryItem
                const mediaProgress =
                  libraryItem.userMediaProgress ??
                  (libraryItem.media?.id ? getMediaItemProgress(libraryItem.media.id) : undefined)

                return (
                  <div key={entity.id + '-' + shelf.id} className="mx-2e shrink-0">
                    <EntityMediaCard
                      libraryItem={libraryItem}
                      bookshelfView={homeBookshelfView}
                      dateFormat={serverSettings?.dateFormat ?? 'MM/dd/yyyy'}
                      timeFormat={serverSettings?.timeFormat ?? 'HH:mm'}
                      userPermissions={user.permissions}
                      ereaderDevices={ereaderDevices}
                      showSubtitles={true}
                      mediaProgress={mediaProgress}
                      shelfEntities={entities ?? []}
                      entityIndex={entityIndex}
                      continueListeningShelf={shelf.id === 'continue-listening' || shelf.id === 'continue-reading'}
                    />
                  </div>
                )
              } else if (shelf.type === 'series') {
                const series = entity as Series
                const libraryItems = series.books || []
                const mediaItemProgressMap = new Map<string, MediaProgress>()
                libraryItems.forEach((libraryItem) => {
                  const mediaProgress =
                    ('userMediaProgress' in libraryItem ? libraryItem.userMediaProgress : undefined) ??
                    (libraryItem.media?.id ? getMediaItemProgress(libraryItem.media.id) : undefined)
                  if (mediaProgress) {
                    const key = mediaProgress.mediaItemId ?? libraryItem.media?.id
                    if (key) mediaItemProgressMap.set(key, mediaProgress)
                  }
                })
                return (
                  <div key={entity.id + '-' + shelf.id} className="mx-2e shrink-0">
                    <SeriesCard
                      series={series}
                      libraryId={library.id}
                      bookshelfView={homeBookshelfView}
                      dateFormat={serverSettings?.dateFormat ?? 'MM/dd/yyyy'}
                      mediaItemProgressMap={mediaItemProgressMap}
                    />
                  </div>
                )
              } else if (shelf.type === 'episode') {
                const libraryItem = entity as LibraryItem
                const episode = libraryItem.recentEpisode
                if (!episode) {
                  return null
                }
                const mediaProgress = libraryItem.userMediaProgress ?? getMediaItemProgress(episode.id)
                return (
                  <div key={episode.id + '-' + shelf.id} className="mx-2e shrink-0">
                    <PodcastEpisodeCard
                      libraryItem={libraryItem}
                      bookshelfView={homeBookshelfView}
                      dateFormat={serverSettings?.dateFormat ?? 'MM/dd/yyyy'}
                      timeFormat={serverSettings?.timeFormat ?? 'HH:mm'}
                      userPermissions={user.permissions}
                      ereaderDevices={ereaderDevices}
                      showSubtitles={true}
                      mediaProgress={mediaProgress}
                    />
                  </div>
                )
              } else if (shelf.type === 'authors') {
                const author = entity as Author
                return (
                  <div key={author.id + '-' + shelf.id} className="mx-2e shrink-0">
                    <AuthorCard author={author} />
                  </div>
                )
              }
            })}
          </Wrapper>
        )
      })}
    </div>
  )
}
