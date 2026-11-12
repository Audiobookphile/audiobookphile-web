'use client'

import { CheckCircle2, Circle, Edit2 } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { memo, useCallback, useId, useMemo, useState } from 'react'
import { useCardSize } from '@/features/library/contexts/CardSizeContext'
import { useUser } from '@/shared/contexts/UserContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { mergeClasses } from '@/shared/lib/merge-classes'
import ConfirmDialog from '@/shared/widgets/ConfirmDialog'
import MediaCardFrame from '@/shared/widgets/media-card/MediaCardFrame'
import MediaCardMoreMenu from '@/shared/widgets/media-card/MediaCardMoreMenu'
import MediaCardOverlayContainer from '@/shared/widgets/media-card/MediaCardOverlayContainer'
import MediaCardStandardFooter from '@/shared/widgets/media-card/MediaCardStandardFooter'
import MediaOverlayIconBtn from '@/shared/widgets/media-card/MediaOverlayIconBtn'
import PlaylistGroupCover from '@/shared/widgets/media-card/PlaylistGroupCover'
import { usePlaylistCardActions } from '@/shared/widgets/media-card/usePlaylistCardActions'
import type { Playlist } from '@/types/api'
import { BookshelfView } from '@/types/api'
import LoadingSpinner from '../LoadingSpinner'

export interface PlaylistCardProps {
  /** The playlist to display */
  playlist: Playlist
  /** View mode (standard or detail) */
  bookshelfView: BookshelfView
  sizeMultiplier?: number
  /** Whether the card is in selection mode */
  isSelectionMode?: boolean
  /** Whether the card is currently selected */
  selected?: boolean
  /** Callback when the select button is clicked */
  onSelect?: (event: React.MouseEvent) => void
  /** Callback when the edit button is clicked */
  onEdit?: (playlist: Playlist) => void
  /** Whether to show the selection button */
  showSelectedButton?: boolean
}

function PlaylistCard(props: PlaylistCardProps) {
  const {
    playlist,
    bookshelfView,
    sizeMultiplier,
    isSelectionMode = false,
    selected = false,
    onSelect,
    onEdit,
    showSelectedButton = false,
  } = props

  const router = useRouter()
  const { userCanUpdate } = useUser()
  const { sizeMultiplier: contextSizeMultiplier } = useCardSize()
  const cardId = useId()
  const t = useTypeSafeTranslations()

  const [isHovering, setIsHovering] = useState(false)
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)

  // Use prop to override context value if provided
  const effectiveSizeMultiplier = sizeMultiplier ?? contextSizeMultiplier

  const items = useMemo(() => playlist.items || [], [playlist.items])

  // Cover dimensions - playlist card is square (same width as height)
  const coverHeight = useMemo(() => 192 * effectiveSizeMultiplier, [effectiveSizeMultiplier])
  // Playlist card is square
  const coverWidth = useMemo(() => coverHeight, [coverHeight])

  // Label font size based on width
  const labelFontSize = useMemo(() => (coverWidth < 160 ? 0.75 : 0.9), [coverWidth])

  // Display title
  const displayTitle = useMemo(() => playlist.name || '\u00A0', [playlist.name])

  const isAlternativeBookshelfView = bookshelfView === BookshelfView.DETAIL

  const showOverlay = (isHovering || isSelectionMode || isMoreMenuOpen) && !false // not processing locally

  const params = useParams()
  const handleCardClick = useCallback(() => {
    const libParam = typeof params?.library === 'string' && params.library ? params.library : playlist.libraryId
    router.push(`/library/${libParam}/playlist/${playlist.id}`)
  }, [playlist.id, playlist.libraryId, params?.library, router])

  const handleEditClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      onEdit?.(playlist)
    },
    [playlist, onEdit]
  )

  // Selection handler - kept for future use
  const handleSelectClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      onSelect?.(event)
    },
    [onSelect]
  )

  const handleMoreMenuOpenChange = useCallback((isOpen: boolean) => {
    setIsMoreMenuOpen(isOpen)
    if (!isOpen) {
      setIsHovering(false)
    }
  }, [])

  const { processing, confirmState, closeConfirm, handleMoreAction, moreMenuItems } = usePlaylistCardActions({
    playlist,
  })

  return (
    <>
      <MediaCardFrame
        width={coverWidth}
        height={coverHeight}
        onClick={!processing ? handleCardClick : undefined}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        cardId={cardId}
        cy-id="playlistCard"
        cover={<PlaylistGroupCover items={items} width={coverWidth} height={coverHeight} />}
        overlay={
          <>
            {/* Hover overlay */}
            {showOverlay && (
              <MediaCardOverlayContainer isSelectionMode={isSelectionMode} selected={selected}>
                {/* Selection button */}
                {showSelectedButton && (isSelectionMode || isHovering) && (
                  <MediaOverlayIconBtn
                    cyId="selectButton"
                    position="top-start"
                    icon={selected ? CheckCircle2 : Circle}
                    onClick={handleSelectClick}
                    ariaLabel={selected ? t('ButtonDeselect') : t('ButtonSelect')}
                    selected={selected}
                  />
                )}

                {/* Edit button */}
                {userCanUpdate && !isSelectionMode && (
                  <MediaOverlayIconBtn
                    cyId="editButton"
                    position="top-end"
                    icon={Edit2}
                    onClick={handleEditClick}
                    ariaLabel={t('ButtonEdit')}
                  />
                )}

                {/* More menu button */}
                {!isSelectionMode && moreMenuItems.length > 0 && (
                  <div
                    cy-id="moreButton"
                    className={mergeClasses(
                      'absolute end-2 bottom-2 cursor-pointer transition-transform duration-300 md:block',
                      'hover:scale-125'
                    )}
                  >
                    <MediaCardMoreMenu
                      items={moreMenuItems}
                      processing={processing}
                      onAction={handleMoreAction}
                      onOpenChange={handleMoreMenuOpenChange}
                    />
                  </div>
                )}
              </MediaCardOverlayContainer>
            )}

            {/* Processing overlay */}
            {processing && (
              <div
                cy-id="loadingSpinner"
                className="absolute start-0 top-0 z-10 flex h-full w-full items-center justify-center rounded-sm bg-black/40"
              >
                <LoadingSpinner size="la-lg" />
              </div>
            )}
          </>
        }
        footer={
          isAlternativeBookshelfView ? (
            // Detail view footer
            <div
              cy-id="detailBottomText"
              className="relative start-0 end-0 z-30 mx-auto rounded-md py-[0.25em] text-center"
            >
              <p cy-id="detailBottomDisplayTitle" className="truncate" style={{ fontSize: `${labelFontSize}em` }}>
                {displayTitle}
              </p>
            </div>
          ) : (
            // Standard view footer (shiny black placard)
            <MediaCardStandardFooter
              displayTitle={displayTitle}
              fontSize={labelFontSize}
              width={Math.min(200, coverWidth)}
            />
          )
        }
      />

      {/* Confirm dialog for delete */}
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
    </>
  )
}

/**
 * Memoized PlaylistCard component to prevent unnecessary re-renders.
 */
const MemoizedPlaylistCard = memo(PlaylistCard)

export { MemoizedPlaylistCard as PlaylistCard }

export default MemoizedPlaylistCard
