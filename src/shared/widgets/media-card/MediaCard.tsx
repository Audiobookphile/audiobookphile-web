'use client'

import { motion } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import { memo, type ReactNode, useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useCardSize } from '@/features/library/contexts/CardSizeContext'
import { useBookCoverAspectRatio, useLibrary } from '@/features/library/contexts/LibraryContext'
import { useMediaContext } from '@/features/player/contexts/MediaContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { getMediaCardModalNavigationContext } from '@/shared/lib/bookshelfNavigationContext'
import { getPlaceholderCoverUrl } from '@/shared/lib/coverUtils'
import { isLibraryItemPlayable } from '@/shared/lib/mediaPlayability'
import { computeProgress } from '@/shared/lib/mediaProgress'
import AddToCollectionModal from '@/shared/modals/AddToCollectionModal'
import AddToPlaylistModal from '@/shared/modals/AddToPlaylistModal'
import LibraryItemEditModal from '@/shared/modals/LibraryItemEditModal'
import MatchModal from '@/shared/modals/MatchModal'
import RssFeedOpenCloseModal from '@/shared/modals/RssFeedOpenCloseModal'
import ShareModal from '@/shared/modals/ShareModal'
import { sanitizeDisplayTitle } from '@/shared/utils/titleAuthorParser'
import ConfirmDialog from '@/shared/widgets/ConfirmDialog'
import MediaCardCover from '@/shared/widgets/media-card/MediaCardCover'
import MediaCardDetailView from '@/shared/widgets/media-card/MediaCardDetailView'
import MediaCardFrame from '@/shared/widgets/media-card/MediaCardFrame'
import MediaCardOverlay from '@/shared/widgets/media-card/MediaCardOverlay'
import { useMediaCardActions } from '@/shared/widgets/media-card/useMediaCardActions'
import type {
  BookMedia,
  BookshelfEntity,
  EReaderDevice,
  LibraryItem,
  MediaProgress,
  PodcastEpisode,
  PodcastMedia,
  UserPermissions,
} from '@/types/api'
import { BookshelfView, isBookMedia, isBookMetadata, isPodcastLibraryItem } from '@/types/api'

export interface MediaCardProps {
  libraryItem: LibraryItem
  bookshelfView: BookshelfView
  orderBy?: string
  sortingIgnorePrefix?: boolean
  continueListeningShelf?: boolean
  /**
   * Server-computed or cached media progress for this library item
   */
  mediaProgress?: MediaProgress | null
  sizeMultiplier?: number
  dateFormat: string
  timeFormat: string
  userPermissions: UserPermissions
  ereaderDevices: EReaderDevice[]
  showSubtitles: boolean
  /**
   * Optional render function for type-specific badges (books/podcasts)
   */
  renderBadges?: (props: { isHovering: boolean; isSelectionMode: boolean; processing: boolean }) => ReactNode
  /**
   * Optional render function for overlay badges (e.g., ebook format)
   */
  renderOverlayBadges?: () => ReactNode
  /**
   * Optional render function for series name overlay when hovering
   */
  renderSeriesNameOverlay?: (isHovering: boolean) => ReactNode
  /**
   * Optional episode to display instead of the main library item (e.g. for recent episodes)
   */
  episode?: PodcastEpisode
  /**
   * Whether the card is in selection mode
   */
  isSelectionMode?: boolean
  /**
   * Whether the card is currently selected
   */
  selected?: boolean
  /**
   * Callback when the select button is clicked
   */
  onSelect?: (event: React.MouseEvent) => void
  /**
   * When both are set, modal prev/next scope is built lazily on open from this shelf snapshot (sparse bookshelf grid or dense home row).
   */
  shelfEntities?: (BookshelfEntity | null)[]
  entityIndex?: number
}

function MediaCard(props: MediaCardProps) {
  const {
    libraryItem,
    bookshelfView,
    orderBy,
    sortingIgnorePrefix = false,
    continueListeningShelf = false,
    mediaProgress,
    sizeMultiplier,
    dateFormat,
    timeFormat,
    ereaderDevices,
    showSubtitles,
    renderBadges,
    renderOverlayBadges,
    renderSeriesNameOverlay,
    episode,
    isSelectionMode = false,
    selected = false,
    onSelect,
    shelfEntities,
    entityIndex,
  } = props

  const router = useRouter()
  const { setBoundModal } = useLibrary()
  const coverAspect = useBookCoverAspectRatio()
  const {
    libraryItemIdStreaming,
    isStreaming,
    isPlaying,
    isStreamingFromDifferentLibrary,
    getIsMediaQueued,
    playerHandler,
  } = useMediaContext()
  const { sizeMultiplier: contextSizeMultiplier } = useCardSize()
  const cardId = useId()
  const t = useTypeSafeTranslations()

  const effectiveSizeMultiplier = sizeMultiplier ?? contextSizeMultiplier

  const [isHovering, setIsHovering] = useState(false)
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)

  const clearBoundModal = useCallback(() => setBoundModal(null), [setBoundModal])

  const handleOpenMatch = useCallback(() => {
    const navCtx = getMediaCardModalNavigationContext(libraryItem.id, shelfEntities, entityIndex)
    setBoundModal(<MatchModal key="match-modal" isOpen navCtx={navCtx} onClose={clearBoundModal} />)
  }, [clearBoundModal, libraryItem.id, shelfEntities, entityIndex, setBoundModal])

  const handleOpenEdit = useCallback(() => {
    const navCtx = getMediaCardModalNavigationContext(libraryItem.id, shelfEntities, entityIndex)
    setBoundModal(
      <LibraryItemEditModal
        key="library-item-edit-modal"
        isOpen
        navCtx={navCtx}
        onClose={clearBoundModal}
        onDeleted={() => {
          clearBoundModal()
          router.refresh()
        }}
      />
    )
  }, [clearBoundModal, libraryItem.id, shelfEntities, entityIndex, setBoundModal, router])

  const handleMoreMenuOpenChange = (isOpen: boolean) => {
    setIsMoreMenuOpen(isOpen)
    if (!isOpen) {
      setIsHovering(false)
    }
  }

  const isPodcast = isPodcastLibraryItem(libraryItem)

  const media = libraryItem.media as BookMedia | PodcastMedia
  const originalMetadata = media.metadata

  const metadata = useMemo(() => {
    if (isBookMetadata(originalMetadata)) {
      return {
        authorName: originalMetadata.authorName ?? originalMetadata.author,
        authorNameLF: originalMetadata.authorNameLF,
        titleIgnorePrefix: originalMetadata.titleIgnorePrefix,
        subtitle: originalMetadata.subtitle,
        seriesName: originalMetadata.seriesName,
        publishedYear: originalMetadata.publishedYear,
      }
    }
    return {
      authorName: originalMetadata.author,
      authorNameLF: null,
      titleIgnorePrefix: null,
      subtitle: null,
      seriesName: null,
      publishedYear: null,
    }
  }, [originalMetadata])

  const placeholderUrl = getPlaceholderCoverUrl()
  const hasCover = !!media.coverPath

  const coverHeight = 192 * effectiveSizeMultiplier
  const coverWidth = coverHeight / coverAspect

  const title = originalMetadata.title || ''
  const isExplicit = originalMetadata.explicit

  const isAlternativeBookshelfView = bookshelfView === BookshelfView.DETAIL
  const isAuthorBookshelfView = bookshelfView === BookshelfView.AUTHOR

  const [rssFeed, setRssFeed] = useState(libraryItem.rssFeed ?? null)

  useEffect(() => {
    setRssFeed(libraryItem.rssFeed ?? null)
  }, [libraryItem.rssFeed])

  const isMissing = libraryItem.isMissing
  const isInvalid = libraryItem.isInvalid

  const {
    percent: userProgressPercent,
    isFinished: itemIsFinished,
    lastUpdated,
    startedAt,
    finishedAt,
  } = useMemo(() => computeProgress({ progress: mediaProgress, useSeriesProgress: false }), [mediaProgress])

  const playIconFontSize = Math.max(2, 3 * effectiveSizeMultiplier)
  const author = metadata.authorName

  const displayTitle = (() => {
    if (episode) return episode.title
    const ignorePrefix = orderBy === 'media.metadata.title' && sortingIgnorePrefix
    if (ignorePrefix && metadata.titleIgnorePrefix) {
      return sanitizeDisplayTitle(metadata.titleIgnorePrefix)
    }
    // Scraped titles carry redundant suffix tags ('[96] Unabridged', '(1517)') —
    // sanitize at render so the DB can be cleaned up lazily.
    return sanitizeDisplayTitle(title) || '\u00A0'
  })()

  const displaySubtitle = (() => {
    if (!libraryItem) return '\u00A0'
    if (metadata.subtitle) return metadata.subtitle
    if (metadata.seriesName) return metadata.seriesName
    return ''
  })()

  const displayLineTwo = (() => {
    if (episode) return title
    if (isPodcast) return author || ''
    if (isAuthorBookshelfView && metadata.publishedYear) {
      return metadata.publishedYear
    }
    if (orderBy === 'media.metadata.authorNameLF' && metadata.authorNameLF) {
      return metadata.authorNameLF
    }
    return author || ''
  })()

  const titleCleaned = !title ? '' : title.length > 60 ? `${title.slice(0, 57)}...` : title
  const authorCleaned = !author ? '' : author.length > 30 ? `${author.slice(0, 27)}...` : author

  const showError = !isPodcast && (isMissing || isInvalid)
  const errorText = isMissing
    ? t('ErrorItemDirectoryMissing')
    : isInvalid
      ? isPodcast
        ? t('ErrorPodcastHasNoEpisodes')
        : t('ErrorItemNoAudioTracksOrEbook')
      : t('ErrorUnknown')

  const isStreamingFromDifferentLib = isStreamingFromDifferentLibrary(libraryItem.libraryId)
  const isQueued = getIsMediaQueued(libraryItem.id, episode?.id ?? null)

  // Was `media.tracks ? media.tracks.length : media.numTracks` — `tracks` is
  // never emitted by the API, and on shelf payloads numTracks came back 0
  // because the projection omitted audio_files. Both now flow through the
  // shared helper, which also honours a known duration.
  const showPlayButton = !isSelectionMode && isLibraryItemPlayable(libraryItem, { episode })

  const isItemPlaying = isPlaying(libraryItem.id, episode?.id ?? null)

  const showReadButton = !isSelectionMode && !showPlayButton && isBookMedia(media) && !!media.ebookFormat

  const {
    processing,
    isPending,
    confirmState,
    rssFeedModalOpen,
    shareModalOpen,
    collectionsModalOpen,
    playlistsModalOpen,
    mediaItemShare,
    closeConfirm,
    closeRssFeedModal,
    closeShareModal,
    closeCollectionsModal,
    closePlaylistsModal,
    handleShareChange,
    handlePlay,
    handleReadEBook,
    handleMoreAction,
    moreMenuItems,
  } = useMediaCardActions({
    libraryItem,
    media,
    title,
    author: author || null,
    episodeForQueue: episode || null,
    mediaProgress,
    itemIsFinished,
    userProgressPercent,
    isPodcast,
    ereaderDevices,
    continueListeningShelf,
    libraryItemIdStreaming,
    isStreaming,
    isStreamingFromDifferentLib,
    isQueued,
    initialShare: libraryItem.mediaItemShare ?? null,
    onDeleteSuccess: () => {
      clearBoundModal()
      router.refresh()
    },
    onOpenMatch: handleOpenMatch,
    playerControls: playerHandler.controls,
  })

  const params = useParams()
  const handleCardClick = () => {
    const libParam = typeof params?.library === 'string' && params.library ? params.library : libraryItem.libraryId
    router.push(`/library/${libParam}/item/${libraryItem.id}`)
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -8, scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 25,
          delay: entityIndex ? (entityIndex % 20) * 0.02 : 0,
        }}
        style={{ willChange: 'transform, opacity' }}
        className="group h-full"
      >
        <MediaCardFrame
          width={coverWidth}
          height={coverHeight}
          onClick={!processing ? handleCardClick : undefined}
          onKeyDown={(event) => {
            if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault()
              handleCardClick()
            }
          }}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          onFocus={() => setIsHovering(true)}
          cardId={cardId}
          ariaLabel={!processing ? displayTitle : undefined}
          cy-id="MediaCard"
          footer={
            (isAlternativeBookshelfView || isAuthorBookshelfView) && (
              <MediaCardDetailView
                displayTitle={displayTitle}
                displaySubtitle={displaySubtitle}
                displayLineTwo={displayLineTwo}
                isExplicit={isExplicit}
                showSubtitles={showSubtitles}
                orderBy={orderBy}
                libraryItem={libraryItem}
                media={media}
                dateFormat={dateFormat}
                timeFormat={timeFormat}
                lastUpdated={lastUpdated}
                startedAt={startedAt}
                finishedAt={finishedAt}
              />
            )
          }
          cover={
            <MediaCardCover
              libraryItem={libraryItem}
              coverAspect={coverAspect}
              placeholderUrl={placeholderUrl}
              hasCover={hasCover}
              title={title}
              titleCleaned={titleCleaned}
              authorCleaned={authorCleaned}
              isPodcast={isPodcast}
              userProgressPercent={userProgressPercent}
              itemIsFinished={itemIsFinished}
              isHovering={isHovering}
            />
          }
          overlay={
            <MediaCardOverlay
              isHovering={isHovering}
              isSelectionMode={isSelectionMode}
              selected={selected}
              processing={processing}
              isPending={isPending}
              isMoreMenuOpen={isMoreMenuOpen}
              showPlayButton={showPlayButton}
              showReadButton={showReadButton}
              isItemPlaying={isItemPlaying}
              playIconFontSize={playIconFontSize}
              moreMenuItems={moreMenuItems}
              rssFeed={rssFeed}
              mediaItemShare={mediaItemShare}
              showError={showError}
              errorText={errorText}
              showSelectRadioButton={!isAuthorBookshelfView}
              renderOverlayBadges={renderOverlayBadges}
              renderBadges={renderBadges}
              renderSeriesNameOverlay={renderSeriesNameOverlay}
              onPlay={handlePlay}
              onRead={handleReadEBook}
              onEdit={handleOpenEdit}
              onMoreAction={handleMoreAction}
              onMoreMenuOpenChange={handleMoreMenuOpenChange}
              onSelect={onSelect}
            />
          }
        />
      </motion.div>

      {confirmState && (
        <ConfirmDialog
          isOpen={confirmState.isOpen}
          message={confirmState.message}
          checkboxLabel={confirmState.checkboxLabel}
          yesButtonText={confirmState.yesButtonText}
          yesButtonClassName={confirmState.yesButtonClassName}
          onClose={closeConfirm}
          onConfirm={(value) => {
            confirmState.onConfirm(value)
          }}
        />
      )}
      {rssFeedModalOpen && (
        <RssFeedOpenCloseModal
          isOpen={rssFeedModalOpen}
          onClose={closeRssFeedModal}
          onFeedChange={setRssFeed}
          entity={{
            id: libraryItem.id,
            name: title,
            type: 'item',
            feed: rssFeed ?? null,
            hasEpisodesWithoutPubDate: isPodcast && ((media as PodcastMedia).episodes ?? []).some((ep) => !ep.pubDate),
          }}
        />
      )}
      {shareModalOpen && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={closeShareModal}
          mediaItemId={libraryItem.media?.id ?? ''}
          mediaItemShare={mediaItemShare}
          onShareChange={handleShareChange}
        />
      )}
      {collectionsModalOpen && (
        <AddToCollectionModal
          isOpen={collectionsModalOpen}
          onClose={closeCollectionsModal}
          libraryId={libraryItem.libraryId}
          libraryItemId={libraryItem.id}
          itemTitle={title}
        />
      )}
      {playlistsModalOpen && (
        <AddToPlaylistModal
          isOpen={playlistsModalOpen}
          onClose={closePlaylistsModal}
          libraryId={libraryItem.libraryId}
          libraryItemId={libraryItem.id}
          episodeId={episode?.id ?? null}
          itemTitle={title}
        />
      )}
    </>
  )
}

const MemoizedMediaCard = memo(MediaCard)

export { MemoizedMediaCard as MediaCard }

export default MemoizedMediaCard
