'use client'

import { Folder, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Fragment, useCallback, useEffect, useState } from 'react'
import LibraryFilesTable from '@/features/library/components/LibraryFilesTable'
import { useLibrary } from '@/features/library/contexts/LibraryContext'
import { useItemPageSocket } from '@/features/library/hooks/useItemPageSocket'
import { clearPodcastDownloadQueueAction } from '@/features/player/actions/mediaActions'
import AudioTracksTable from '@/features/player/components/AudioTracksTable'
import ChaptersTable from '@/features/player/components/ChaptersTable'
import { useGlobalToast } from '@/shared/contexts/ToastContext'
import { useUser } from '@/shared/contexts/UserContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import LibraryItemEditModal from '@/shared/modals/LibraryItemEditModal'
import { sanitizeDisplayTitle } from '@/shared/utils/titleAuthorParser'
import ConfirmDialog from '@/shared/widgets/ConfirmDialog'
import EpisodeTable from '@/shared/widgets/EpisodeTable'
import ExpandableHtml from '@/shared/widgets/ExpandableHtml'
import LoadingSpinner from '@/shared/widgets/LoadingSpinner'
import SimilarBooksShelf from '@/shared/widgets/SimilarBooksShelf'
import { BookLibraryItem, BookMetadata, PodcastLibraryItem, PodcastMetadata } from '@/types/api'
import LibraryItemActionButtons from './LibraryItemActionButtons'
import LibraryItemCover from './LibraryItemCover'
import LibraryItemDetails from './LibraryItemDetails'

interface LibraryItemClientProps {
  libraryItem: BookLibraryItem | PodcastLibraryItem
}

export default function LibraryItemClient({ libraryItem: initialLibraryItem }: LibraryItemClientProps) {
  const { library } = useLibrary()
  const router = useRouter()
  const { serverSettings, getMediaItemProgress, userCanUpdate, userIsAdminOrUp } = useUser()
  const { showToast } = useGlobalToast()
  const t = useTypeSafeTranslations()

  const [libraryItem, setLibraryItem] = useState(initialLibraryItem)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isClearQueueDialogOpen, setIsClearQueueDialogOpen] = useState(false)

  useEffect(() => {
    setLibraryItem(initialLibraryItem)
  }, [initialLibraryItem])

  const isPodcast = libraryItem.mediaType === 'podcast'
  const metadata = libraryItem.media?.metadata as BookMetadata | PodcastMetadata | undefined
  const podcastAuthor = metadata && 'author' in metadata ? metadata.author : undefined
  const subtitle = metadata && 'subtitle' in metadata ? metadata.subtitle : undefined
  const bookAuthors = metadata && 'authors' in metadata && Array.isArray(metadata.authors) ? metadata.authors : []
  const bookSeries = metadata && 'series' in metadata && Array.isArray(metadata.series) ? metadata.series : []
  const description = metadata && 'description' in metadata ? metadata.description : undefined

  const userProgress = libraryItem.media?.id ? getMediaItemProgress(libraryItem.media.id) : undefined

  const handleOpenEditModal = () => {
    setIsEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
  }

  const handleItemSaved = (updatedItem: BookLibraryItem | PodcastLibraryItem) => {
    setLibraryItem(updatedItem)
  }

  const handleItemDeleted = useCallback(() => {
    setIsEditModalOpen(false)
    router.push(`/library/${library.id}`)
  }, [library.id, router])

  const { rssFeed, episodesDownloading, episodeDownloadsQueued } = useItemPageSocket({
    libraryItemId: libraryItem.id,
    mediaId: libraryItem.media?.id,
    isPodcast,
    onItemUpdated: handleItemSaved,
    initialRssFeed: initialLibraryItem.rssFeed ?? null,
  })

  const handleClearDownloadQueue = useCallback(async () => {
    try {
      await clearPodcastDownloadQueueAction(libraryItem.id)
      showToast(t('ToastEpisodeDownloadQueueClearSuccess'), { type: 'success' })
      setIsClearQueueDialogOpen(false)
    } catch (error) {
      console.error('Failed to clear queue', error)
      showToast(t('ToastEpisodeDownloadQueueClearFailed'), { type: 'error' })
    }
  }, [libraryItem.id, showToast, t])

  return (
    <div>
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-6 md:flex-row md:gap-8">
          <div className="mx-auto flex w-full max-w-72 flex-shrink-0 items-start justify-center md:w-52 md:max-w-52 md:justify-start">
            <LibraryItemCover
              libraryItem={libraryItem}
              canUpdate={userCanUpdate}
              mediaProgress={userProgress}
              onEdit={handleOpenEditModal}
            />
          </div>
          <div className="flex-1">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold md:text-3xl">
                {metadata?.title ? sanitizeDisplayTitle(metadata.title) : ''}
              </h1>
              {subtitle && <h2 className="text-xl font-medium text-foreground-muted md:text-2xl">{subtitle}</h2>}
              {podcastAuthor && (
                <h2 className="text-lg font-medium text-foreground md:text-xl">
                  {t('LabelByAuthor', { 0: podcastAuthor })}
                </h2>
              )}
              {bookSeries.length > 0 && (
                <div>
                  {bookSeries.map((series, index) => {
                    return (
                      <Fragment key={series.id}>
                        <a
                          href={`/library/${library.id}/series/${series.id}`}
                          className="text-lg text-foreground-muted hover:underline"
                        >
                          {series.name}
                          {series.sequence && (
                            <span className="text-lg text-foreground-muted"> #{series.sequence}</span>
                          )}
                        </a>
                        {index < bookSeries.length - 1 && <span className="text-lg text-foreground-muted">, </span>}
                      </Fragment>
                    )
                  })}
                </div>
              )}

              {bookAuthors.length > 0 && (
                <div>
                  <span className="text-lg text-foreground">{t('LabelByAuthor', { 0: '' })}</span>
                  {bookAuthors.map((author, index) => {
                    return (
                      <Fragment key={author.id}>
                        <a
                          href={`/library/${library.id}/authors/${author.id}`}
                          className="text-lg text-foreground hover:underline md:text-xl"
                        >
                          {author.name}
                        </a>
                        {index < bookAuthors.length - 1 && (
                          <span className="text-lg text-foreground md:text-xl">, </span>
                        )}
                      </Fragment>
                    )
                  })}
                </div>
              )}
            </div>

            <LibraryItemDetails libraryItem={libraryItem} />

            <LibraryItemActionButtons
              libraryItem={libraryItem}
              onEdit={handleOpenEditModal}
              rssFeed={rssFeed ?? null}
            />

            {/* Podcast episode downloads queue */}
            {episodeDownloadsQueued.length > 0 && (
              <div className="mx-auto mt-4 max-w-max rounded-xl border border-white/5 bg-black/20 px-5 py-3 backdrop-blur-md md:mx-0">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Folder size={18} className="text-primary" />
                    <p className="text-sm font-medium text-white/90">
                      {t('MessageEpisodesQueuedForDownload', { count: episodeDownloadsQueued.length })}
                    </p>
                  </div>
                  {userIsAdminOrUp && (
                    <button
                      type="button"
                      aria-label="Clear episode download queue"
                      className="rounded-lg bg-white/5 p-1.5 transition-colors hover:bg-error/20 hover:text-error"
                      onClick={() => setIsClearQueueDialogOpen(true)}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Podcast episodes currently downloading */}
            {episodesDownloading.length > 0 && (
              <div className="relative mx-auto mt-4 max-w-max rounded-md bg-success/20 px-4 py-2 text-sm font-semibold text-gray-100 md:mx-0">
                {episodesDownloading.map((episode) => (
                  <div key={episode.id} className="flex items-center">
                    <LoadingSpinner />
                    <p className="py-1 pl-4 text-sm">{`${t('MessageDownloadingEpisode')} "${episode.episodeDisplayTitle ?? ''}"`}</p>
                  </div>
                ))}
              </div>
            )}

            {description && <ExpandableHtml html={description} lineClamp={4} className="mt-6" />}

            <div className="mt-6 flex flex-col gap-4">
              {/* chapters table */}
              {libraryItem.mediaType === 'book' && (libraryItem.media?.chapters?.length ?? 0) > 0 && (
                <ChaptersTable libraryItem={libraryItem} />
              )}

              {/* audio tracks table — audioFiles is the API's per-track array;
                  `tracks` never exists on an API payload, so gating on it hid
                  the table entirely. */}
              {libraryItem.mediaType === 'book' && (libraryItem.media?.audioFiles?.length ?? 0) > 0 && (
                <AudioTracksTable libraryItem={libraryItem} />
              )}

              {/* podcast episodes table */}
              {isPodcast && (
                <EpisodeTable
                  libraryItem={libraryItem}
                  dateFormat={serverSettings?.dateFormat}
                  episodesDownloading={episodesDownloading}
                  episodeDownloadsQueued={episodeDownloadsQueued}
                />
              )}

              {/* library files table */}
              {!isPodcast && (libraryItem.libraryFiles?.length ?? 0) > 0 && (
                <LibraryFilesTable libraryItem={libraryItem} />
              )}
            </div>

            {/* AI Recommendations Shelf */}
            <SimilarBooksShelf libraryItem={libraryItem} />
          </div>
        </div>
      </div>

      <LibraryItemEditModal
        isOpen={isEditModalOpen}
        libraryItem={libraryItem}
        onClose={handleCloseEditModal}
        onSaved={handleItemSaved}
        onDeleted={handleItemDeleted}
      />
      <ConfirmDialog
        isOpen={isClearQueueDialogOpen}
        message="Are you sure you want to clear episode download queue?"
        onClose={() => setIsClearQueueDialogOpen(false)}
        onConfirm={handleClearDownloadQueue}
      />
    </div>
  )
}
