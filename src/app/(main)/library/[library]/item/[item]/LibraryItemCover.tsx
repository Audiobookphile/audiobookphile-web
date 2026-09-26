'use client'

import { Pencil, Play } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useBookCoverAspectRatio } from '@/features/library/contexts/LibraryContext'
import { useMediaContext } from '@/features/player/contexts/MediaContext'
import { usePlayLibraryItem } from '@/features/player/hooks/usePlayLibraryItem'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { getLibraryItemCoverUrl, getPlaceholderCoverUrl, isMissingCoverPath } from '@/shared/lib/coverUtils'
import { isLibraryItemPlayable } from '@/shared/lib/mediaPlayability'
import { computeProgress } from '@/shared/lib/mediaProgress'
import { mergeClasses } from '@/shared/lib/merge-classes'
import RawCoverPreviewModal from '@/shared/modals/RawCoverPreviewModal'
import IconBtn from '@/shared/ui/IconBtn'
import MediaCardCover from '@/shared/widgets/media-card/MediaCardCover'
import MediaCardFrame from '@/shared/widgets/media-card/MediaCardFrame'
import MediaOverlayIconBtn from '@/shared/widgets/media-card/MediaOverlayIconBtn'
import type { BookLibraryItem, BookMetadata, LibraryItem, MediaProgress, PodcastLibraryItem } from '@/types/api'
import { isPodcastLibraryItem } from '@/types/api'

interface LibraryItemCoverProps {
  libraryItem: BookLibraryItem | PodcastLibraryItem
  canUpdate?: boolean
  onEdit?: () => void
  mediaProgress?: MediaProgress | null
  className?: string
}

export default function LibraryItemCover({
  libraryItem,
  canUpdate = false,
  className,
  mediaProgress,
  onEdit,
}: LibraryItemCoverProps) {
  const coverAspectRatio = useBookCoverAspectRatio()
  const t = useTypeSafeTranslations()
  const [isHovering, setIsHovering] = useState(false)
  const { playerHandler } = useMediaContext()

  const [showPreviewModal, setShowPreviewModal] = useState(false)

  const isPodcast = isPodcastLibraryItem(libraryItem)
  const mediaMetadata = libraryItem.media?.metadata

  // The overlay Play button used to render unconditionally and call an empty
  // handler, so tapping it silently did nothing. Drive both visibility and
  // behaviour from the same playability check + shared play hook that the
  // action button bar and the media card use.
  const isPlayable = isLibraryItemPlayable(libraryItem)
  const { play: playFromCover, processing: isStartingPlayback } = usePlayLibraryItem({
    libraryItem,
    playerControls: playerHandler.controls,
  })

  const handlePlayFromCover = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      playFromCover()
    },
    [playFromCover]
  )

  const title = mediaMetadata?.title || ''
  const author = isPodcast ? mediaMetadata?.author : (mediaMetadata as BookMetadata)?.authorName || ''
  const titleCleaned = !title ? '' : title.length > 60 ? `${title.slice(0, 57)}...` : title
  const authorCleaned = !author ? '' : author.length > 30 ? `${author.slice(0, 27)}...` : author

  const coverPath = libraryItem.media?.coverPath

  const { percent: userProgressPercent, isFinished: itemIsFinished } = useMemo(
    () => computeProgress({ progress: mediaProgress, useSeriesProgress: false }),
    [mediaProgress]
  )

  const rawCoverUrl = useMemo(() => {
    if (!coverPath || isMissingCoverPath(coverPath)) return getPlaceholderCoverUrl()
    return getLibraryItemCoverUrl(libraryItem.id, libraryItem.updatedAt)
  }, [coverPath, libraryItem.id, libraryItem.updatedAt])

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false)
  }, [])

  const handleCoverClick = useCallback(() => {
    if (window.matchMedia('(max-width: 768px)').matches) return
    if (!coverPath) return
    setShowPreviewModal(true)
  }, [coverPath])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        e.stopPropagation()
        if (window.matchMedia('(max-width: 768px)').matches) return
        if (!coverPath) return
        setShowPreviewModal(true)
      }
    },
    [coverPath]
  )

  const showOverlay = isHovering
  const hasOverlayActions = isPlayable || (canUpdate && !!onEdit)

  return (
    <>
      <MediaCardFrame
        width="100%"
        height="auto"
        aspectRatio={1 / coverAspectRatio}
        className={mergeClasses('group', className)}
        onClick={coverPath ? handleCoverClick : undefined}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        cover={
          <MediaCardCover
            libraryItem={libraryItem as LibraryItem}
            coverAspect={coverAspectRatio}
            placeholderUrl={getPlaceholderCoverUrl()}
            hasCover={!!coverPath}
            title={title}
            titleCleaned={titleCleaned}
            authorCleaned={authorCleaned}
            isPodcast={isPodcast}
            userProgressPercent={userProgressPercent}
            itemIsFinished={itemIsFinished}
          />
        }
        overlay={
          hasOverlayActions ? (
            <div
              className={mergeClasses(
                'absolute inset-0 z-10 bg-black/40 transition-opacity duration-200',
                showOverlay
                  ? 'opacity-100'
                  : 'pointer-events-none opacity-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100'
              )}
            >
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                {isPlayable && (
                  <IconBtn
                    borderless
                    outlined={false}
                    className="pointer-events-auto transform text-gray-200 duration-200 hover:scale-110 hover:text-white disabled:pointer-events-none disabled:opacity-60"
                    style={{ fontSize: '4rem' }}
                    disabled={isStartingPlayback}
                    onClick={handlePlayFromCover}
                    ariaLabel={t('ButtonPlay')}
                  >
                    <Play size={48} fill="currentColor" />
                  </IconBtn>
                )}
              </div>

              {canUpdate && onEdit && (
                <MediaOverlayIconBtn
                  position="bottom-end"
                  icon={Pencil}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onEdit()
                  }}
                  ariaLabel={t('ButtonEdit')}
                />
              )}
            </div>
          ) : undefined
        }
      />

      <RawCoverPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        coverUrl={rawCoverUrl}
      />
    </>
  )
}
