'use client'

import { BookOpen, ChevronLeft, ChevronRight, ChevronsUpDown, Folder, X } from 'lucide-react'
import Link from 'next/link'
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
import { apiFetch } from '@/shared/lib/api/browser'
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
  const [areAllSectionsExpanded, setAreAllSectionsExpanded] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    setLibraryItem(initialLibraryItem)
  }, [initialLibraryItem])

  const isPodcast = libraryItem.mediaType === 'podcast'
  const isBook = libraryItem.mediaType === 'book'
  const metadata = libraryItem.media?.metadata as BookMetadata | PodcastMetadata | undefined
  const podcastAuthor = metadata && 'author' in metadata ? metadata.author : undefined
  const subtitle = metadata && 'subtitle' in metadata ? metadata.subtitle : undefined
  const bookAuthors = metadata && 'authors' in metadata && Array.isArray(metadata.authors) ? metadata.authors : []
  const bookSeries = metadata && 'series' in metadata && Array.isArray(metadata.series) ? metadata.series : []
  const description = metadata && 'description' in metadata ? metadata.description : undefined

  interface SeriesContinuityBook {
    id: string
    title: string
    sequence?: string
  }
  const [seriesContinuity, setSeriesContinuity] = useState<{
    previous: SeriesContinuityBook | null
    next: SeriesContinuityBook | null
    seriesName: string
  } | null>(null)

  useEffect(() => {
    if (!isBook || bookSeries.length === 0 || !bookSeries[0]?.id) return
    const primarySeries = bookSeries[0]
    let isCancelled = false

    const loadSeries = async () => {
      try {
        const res = await apiFetch<{ books?: any[] }>(`/api/libraries/${library.id}/series/${primarySeries.id}`)
        if (!res.ok || !res.data || isCancelled) return
        const books = res.data.books || []
        const currentIdx = books.findIndex((b: any) => b.id === libraryItem.id)
        if (currentIdx === -1) return

        const prev = currentIdx > 0 ? {
          id: books[currentIdx - 1].id,
          title: books[currentIdx - 1].title || books[currentIdx - 1].media?.metadata?.title || 'Previous Book',
          sequence: books[currentIdx - 1].sequence || books[currentIdx - 1].media?.metadata?.series?.[0]?.sequence,
        } : null

        const next = currentIdx + 1 < books.length ? {
          id: books[currentIdx + 1].id,
          title: books[currentIdx + 1].title || books[currentIdx + 1].media?.metadata?.title || 'Next Book',
          sequence: books[currentIdx + 1].sequence || books[currentIdx + 1].media?.metadata?.series?.[0]?.sequence,
        } : null

        if (!isCancelled && (prev || next)) {
          setSeriesContinuity({
            previous: prev,
            next: next,
            seriesName: primarySeries.name,
          })
        }
      } catch (err) {
        console.error('[LibraryItemClient] Failed to load series continuity:', err)
      }
    }

    void loadSeries()
    return () => {
      isCancelled = true
    }
  }, [isBook, bookSeries, library.id, libraryItem.id])

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
                        <Link
                          href={`/library/${library.id}/series/${series.id}`}
                          className="text-lg text-foreground-muted transition-colors hover:text-primary hover:underline"
                        >
                          {series.name}
                          {series.sequence && (
                            <span className="text-lg text-foreground-muted"> #{series.sequence}</span>
                          )}
                        </Link>
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
                        <Link
                          href={`/library/${library.id}/authors/${author.id}`}
                          className="text-lg text-foreground transition-colors hover:text-primary hover:underline md:text-xl"
                        >
                          {author.name}
                        </Link>
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

            {/* Series Continuity (Previous & Next book in series) */}
            {seriesContinuity && (seriesContinuity.previous || seriesContinuity.next) && (
              <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground-subdued">
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                  <span>Series Continuity: {seriesContinuity.seriesName}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                  {seriesContinuity.previous ? (
                    <Link
                      href={`/library/${library.id}/item/${seriesContinuity.previous.id}`}
                      className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition-all hover:border-primary/40 hover:bg-primary/5 active:scale-95"
                    >
                      <ChevronLeft className="h-4 w-4 text-primary shrink-0 transition-transform group-hover:-translate-x-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-foreground-subdued">
                          Previous {seriesContinuity.previous.sequence ? `#${seriesContinuity.previous.sequence}` : ''}
                        </p>
                        <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                          {seriesContinuity.previous.title}
                        </p>
                      </div>
                    </Link>
                  ) : (
                    <div className="hidden sm:block" />
                  )}
                  {seriesContinuity.next && (
                    <Link
                      href={`/library/${library.id}/item/${seriesContinuity.next.id}`}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition-all hover:border-primary/40 hover:bg-primary/5 active:scale-95 sm:col-start-2"
                    >
                      <div className="min-w-0 flex-1 text-right sm:text-left">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                          Next in Series {seriesContinuity.next.sequence ? `#${seriesContinuity.next.sequence}` : ''}
                        </p>
                        <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                          {seriesContinuity.next.title}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-primary shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  )}
                </div>
              </div>
            )}

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
              {/* Expand / Collapse All Sections Toolbar */}
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold tracking-wider uppercase text-foreground-muted">
                  Book Media & Content
                </span>
                <button
                  type="button"
                  onClick={() => setAreAllSectionsExpanded((prev) => !prev)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-foreground-muted transition-all hover:bg-white/10 hover:text-foreground cursor-pointer"
                  title={areAllSectionsExpanded ? 'Collapse all media sections' : 'Expand all media sections'}
                >
                  <ChevronsUpDown className="h-3.5 w-3.5" />
                  <span>{areAllSectionsExpanded ? 'Collapse All' : 'Expand All'}</span>
                </button>
              </div>

              {/* chapters table */}
              {libraryItem.mediaType === 'book' && (libraryItem.media?.chapters?.length ?? 0) > 0 && (
                <ChaptersTable libraryItem={libraryItem} expanded={areAllSectionsExpanded} />
              )}

              {/* audio tracks table — audioFiles is the API's per-track array;
                  `tracks` never exists on an API payload, so gating on it hid
                  the table entirely. */}
              {libraryItem.mediaType === 'book' && (libraryItem.media?.audioFiles?.length ?? 0) > 0 && (
                <AudioTracksTable libraryItem={libraryItem} expanded={areAllSectionsExpanded} />
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
                <LibraryFilesTable libraryItem={libraryItem} expanded={areAllSectionsExpanded} />
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
