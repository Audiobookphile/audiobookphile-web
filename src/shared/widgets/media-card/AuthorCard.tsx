'use client'

import { CheckCircle2, Circle, Edit2, Search } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { memo, useCallback, useId, useState } from 'react'
import { useCardSize } from '@/features/library/contexts/CardSizeContext'
import { useLibrary } from '@/features/library/contexts/LibraryContext'
import AuthorImage from '@/features/metadata/components/AuthorImage'
import { useAuthorActions } from '@/features/metadata/hooks/useAuthorActions'
import { useUser } from '@/shared/contexts/UserContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import AuthorEditModal from '@/shared/modals/AuthorEditModal'
import LoadingSpinner from '@/shared/widgets/LoadingSpinner'
import MediaCardFrame from '@/shared/widgets/media-card/MediaCardFrame'
import MediaCardOverlayContainer from '@/shared/widgets/media-card/MediaCardOverlayContainer'
import MediaOverlayIconBtn from '@/shared/widgets/media-card/MediaOverlayIconBtn'
import type { Author } from '@/types/api'

export interface AuthorCardProps {
  /** The author to display */
  author: Author
  /** Cover configuration */
  sizeMultiplier?: number
  /** Whether the card is in selection mode */
  isSelectionMode?: boolean
  /** Whether the card is currently selected */
  selected?: boolean
  /** Callback when the select button is clicked */
  onSelect?: (event: React.MouseEvent) => void
}

function AuthorCard(props: AuthorCardProps) {
  const { author, sizeMultiplier, isSelectionMode = false, selected = false, onSelect } = props

  const router = useRouter()
  const { user, userCanUpdate } = useUser()
  const { sizeMultiplier: contextSizeMultiplier } = useCardSize()
  const cardId = useId()
  const t = useTypeSafeTranslations()

  const { setBoundModal } = useLibrary()
  const clearBoundModal = useCallback(() => setBoundModal(null), [setBoundModal])
  const [isHovering, setIsHovering] = useState(false)

  const { quickMatchingAuthorIds, handleQuickMatch } = useAuthorActions()

  const isSearching = quickMatchingAuthorIds.has(author.id)

  // Use prop to override context value if provided
  const effectiveSizeMultiplier = sizeMultiplier ?? contextSizeMultiplier

  // Cover dimensions - author card is portrait (width = height * 0.8)
  const coverHeight = 192 * effectiveSizeMultiplier
  const coverWidth = coverHeight * 0.8

  // Display values
  const displayName = author.name || '\u00A0'
  const numBooks = author.numBooks || 0

  const showOverlay = (isHovering || isSelectionMode) && !isSearching

  const params = useParams()
  const handleCardClick = useCallback(() => {
    if (!isSearching) {
      const libParam = typeof params?.library === 'string' && params.library ? params.library : author.libraryId
      router.push(`/library/${libParam}/authors/${author.id}`)
    }
  }, [author.id, author.libraryId, isSearching, params?.library, router])

  const handleEditClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (user) {
        setBoundModal(
          <AuthorEditModal key={author.id} isOpen={true} user={user} onClose={clearBoundModal} author={author} />
        )
      }
    },
    [user, author, clearBoundModal, setBoundModal]
  )

  const handleQuickMatchClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      void handleQuickMatch(author)
    },
    [author, handleQuickMatch]
  )

  const handleSelectClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      onSelect?.(event)
    },
    [onSelect]
  )

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleCardClick()
    }
  }

  return (
    <>
      <MediaCardFrame
        width={coverWidth}
        height={coverHeight}
        onClick={!isSearching ? handleCardClick : undefined}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onKeyDown={handleKeyDown}
        cardId={cardId}
        cy-id="authorCard"
        cover={<AuthorImage author={author} />}
        overlay={
          <>
            {/* Permanent author name & num books overlay */}
            {!isSearching && (
              <div cy-id="textInline" className="absolute start-0 bottom-0 z-10 w-full bg-black/60 px-2 py-1">
                <p className="truncate text-center text-[0.75em] font-semibold text-white">{displayName}</p>
                <p className="text-center text-[0.65em] text-gray-200">
                  {numBooks} {t('LabelBooks')}
                </p>
              </div>
            )}

            {/* Hover overlay with dark semi-transparent background */}
            {showOverlay && (
              <MediaCardOverlayContainer isSelectionMode={isSelectionMode} selected={selected}>
                {/* Selection button */}
                {isSelectionMode && (
                  <MediaOverlayIconBtn
                    cyId="selectButton"
                    position="top-start"
                    icon={selected ? CheckCircle2 : Circle}
                    onClick={handleSelectClick}
                    ariaLabel={selected ? t('ButtonDeselect') : t('ButtonSelect')}
                    selected={selected}
                  />
                )}

                {/* Quick Match button (top-left) */}
                {!isSelectionMode && userCanUpdate && (
                  <MediaOverlayIconBtn
                    cyId="quickMatch"
                    position="top-start"
                    icon={Search}
                    onClick={handleQuickMatchClick}
                    ariaLabel={t('ButtonQuickMatch')}
                  />
                )}

                {/* Edit button (top-right) */}
                {!isSelectionMode && userCanUpdate && (
                  <MediaOverlayIconBtn
                    cyId="editButton"
                    position="top-end"
                    icon={Edit2}
                    onClick={handleEditClick}
                    ariaLabel={t('ButtonEdit')}
                  />
                )}
              </MediaCardOverlayContainer>
            )}

            {/* Loading spinner overlay (Quick Match in progress) */}
            {isSearching && (
              <div
                cy-id="spinner"
                className="absolute start-0 top-0 z-30 flex h-full w-full items-center justify-center bg-black/50"
                role="status"
                aria-label={t('MessageLoading')}
              >
                <LoadingSpinner />
              </div>
            )}
          </>
        }
      />
    </>
  )
}

/**
 * Memoized AuthorCard component to prevent unnecessary re-renders.
 */
const MemoizedAuthorCard = memo(AuthorCard)

export { MemoizedAuthorCard as AuthorCard }

export default MemoizedAuthorCard
