'use client'

import { CheckCircle2, Circle } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { memo, useId, useMemo, useState } from 'react'
import { useCardSize } from '@/features/library/contexts/CardSizeContext'
import { useBookCoverAspectRatio } from '@/features/library/contexts/LibraryContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { formatJsDate } from '@/shared/lib/datefns'
import { formatDuration } from '@/shared/lib/formatDuration'
import { mergeClasses } from '@/shared/lib/merge-classes'
import MediaCardFrame from '@/shared/widgets/media-card/MediaCardFrame'
import MediaCardOverlayContainer from '@/shared/widgets/media-card/MediaCardOverlayContainer'
import MediaCardStandardFooter from '@/shared/widgets/media-card/MediaCardStandardFooter'
import MediaOverlayIconBtn from '@/shared/widgets/media-card/MediaOverlayIconBtn'
import SeriesGroupCover from '@/shared/widgets/media-card/SeriesGroupCover'
import type { MediaProgress, Series } from '@/types/api'
import { BookshelfView } from '@/types/api'

export interface SeriesCardProps {
  /** The series to display */
  series: Series
  /** Library ID for navigation */
  libraryId: string
  /** View mode (standard or detail) */
  bookshelfView: BookshelfView
  /** Field being sorted by */
  orderBy?: string
  /** Whether to use title without prefix when sorting */
  sortingIgnorePrefix?: boolean
  sizeMultiplier?: number
  /** Date format from server settings */
  dateFormat: string
  /**
   * Map of progress keyed by book `mediaItemId`
   * Used to calculate series progress.
   */
  mediaItemProgressMap?: Map<string, MediaProgress>
  /** Whether the card is in selection mode */
  isSelectionMode?: boolean
  /** Whether the card is currently selected */
  selected?: boolean
  /** Callback when the select button is clicked */
  onSelect?: (event: React.MouseEvent) => void
  /** Whether to show the selection button */
  showSelectedButton?: boolean
}

function SeriesCard(props: SeriesCardProps) {
  const {
    series,
    libraryId,
    bookshelfView,
    orderBy,
    sortingIgnorePrefix = false,
    sizeMultiplier,
    dateFormat,
    mediaItemProgressMap,
    isSelectionMode = false,
    selected = false,
    onSelect,
    showSelectedButton = false,
  } = props

  const router = useRouter()
  const coverAspect = useBookCoverAspectRatio()
  const { sizeMultiplier: contextSizeMultiplier } = useCardSize()
  const cardId = useId()
  const t = useTypeSafeTranslations()

  const [isHovering, setIsHovering] = useState(false)

  // Use prop to override context value if provided
  const effectiveSizeMultiplier = sizeMultiplier ?? contextSizeMultiplier

  // Cover dimensions - series card is wider (2x width of a single book cover)
  const coverHeight = 192 * effectiveSizeMultiplier
  // Series card is wider (2x width of a single book cover)
  const coverWidth = (coverHeight / coverAspect) * 2

  // Label font size based on width
  const labelFontSize = coverWidth < 160 ? 0.75 : 0.9

  // Display title with optional ignore prefix handling
  const displayTitle =
    sortingIgnorePrefix && series.nameIgnorePrefix ? series.nameIgnorePrefix : series.name || '\u00A0'

  // Calculate series progress from book progress
  const { seriesProgressPercent, isSeriesFinished } = useMemo(() => {
    const books = series.books || []
    if (!books.length || !mediaItemProgressMap) {
      return { seriesProgressPercent: 0, isSeriesFinished: false }
    }

    let progressPercent = 0
    let finishedCount = 0

    books.forEach((book) => {
      const progress = book.media?.id ? mediaItemProgressMap.get(book.media.id) : undefined
      if (progress) {
        if (progress.isFinished) {
          progressPercent += 1
          finishedCount++
        } else if (progress.progress) {
          progressPercent += progress.progress
        }
      }
    })

    progressPercent /= books.length
    progressPercent = Math.min(1, Math.max(0, progressPercent))

    return {
      seriesProgressPercent: progressPercent,
      isSeriesFinished: finishedCount === books.length,
    }
  }, [series.books, mediaItemProgressMap])

  // Check if any books have valid covers
  const hasValidCovers = useMemo(() => {
    const books = Array.isArray(series.books) ? series.books : []
    return books.some((book) => book.media?.coverPath)
  }, [series.books])

  // For JSX usage
  const books = Array.isArray(series.books) ? series.books : []

  // Sort line for detail view
  const displaySortLine = useMemo(() => {
    const seriesBooks = Array.isArray(series.books) ? series.books : []
    if (!orderBy) return null

    switch (orderBy) {
      case 'addedAt': {
        if (!series.addedAt) return null
        return t('LabelAddedDate', { 0: formatJsDate(new Date(series.addedAt), dateFormat) })
      }
      case 'totalDuration': {
        const totalDuration = seriesBooks.reduce((acc: number, book) => {
          const duration = (book.media as { duration?: number })?.duration || 0
          return acc + duration
        }, 0)
        return `${t('LabelDuration')} ${formatDuration(totalDuration, t, { showDays: true })}`
      }
      case 'lastBookUpdated': {
        const lastUpdated = Math.max(...seriesBooks.map((book) => book.updatedAt || 0), 0)
        if (!lastUpdated) return null
        return `${t('LabelLastBookUpdated')} ${formatJsDate(new Date(lastUpdated), dateFormat)}`
      }
      case 'lastBookAdded': {
        const lastAdded = Math.max(...seriesBooks.map((book) => book.addedAt || 0), 0)
        if (!lastAdded) return null
        return `${t('LabelLastBookAdded')} ${formatJsDate(new Date(lastAdded), dateFormat)}`
      }
      default:
        return null
    }
  }, [orderBy, series.addedAt, series.books, dateFormat, t])

  const isAlternativeBookshelfView = bookshelfView === BookshelfView.DETAIL

  const params = useParams()
  const handleCardClick = () => {
    const libParam = typeof params?.library === 'string' && params.library ? params.library : libraryId
    router.push(`/library/${libParam}/series/${series.id}`)
  }

  const handleSelectClick = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    onSelect?.(event)
  }

  return (
    <MediaCardFrame
      width={coverWidth}
      height={coverHeight}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      cardId={cardId}
      cy-id="seriesCard"
      cover={
        <SeriesGroupCover
          name={series.name || ''}
          books={books}
          width={coverWidth}
          height={coverHeight}
          bookCoverAspectRatio={coverAspect}
        />
      }
      overlay={
        <>
          {/* Books count badge */}
          <div
            cy-id="seriesLengthMarker"
            className="absolute end-2 top-2 z-20 rounded-lg border border-white/10 bg-primary/90 px-2 py-0.5 shadow-2xl backdrop-blur-md"
          >
            <p
              className="text-[10px] font-black tracking-tighter text-white"
              role="status"
              aria-label={t('LabelNumberOfBooks')}
            >
              {books.length}
            </p>
          </div>

          {/* Progress bar */}
          {seriesProgressPercent > 0 && (
            <div className="absolute start-0 bottom-0 z-10 h-1 w-full overflow-hidden rounded-b bg-white/10">
              <div
                cy-id="seriesProgressBar"
                className={mergeClasses(
                  'h-full shadow-[0_0_8px_rgba(251,191,36,0.5)] transition-all duration-500',
                  isSeriesFinished ? 'bg-success' : 'bg-primary'
                )}
                style={{ width: `${seriesProgressPercent * 100}%` }}
              />
            </div>
          )}

          {/* Hover/Selection overlay with display title */}
          <MediaCardOverlayContainer
            isSelectionMode={isSelectionMode}
            selected={selected}
            cyId="hoveringDisplayTitle"
            className={mergeClasses(
              'bg-primary/40 z-20 flex items-center justify-center text-center backdrop-blur-md transition-opacity duration-300',
              isHovering || isSelectionMode ? 'opacity-100' : 'opacity-0'
            )}
          >
            <div className="p-4">
              {hasValidCovers && isHovering && (
                <p className="text-sm font-black tracking-wider text-white uppercase drop-shadow-lg">{displayTitle}</p>
              )}
            </div>

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
          </MediaCardOverlayContainer>

          {/* RSS feed indicator */}
          {series.rssFeed && !isSelectionMode && !isHovering && (
            <div
              cy-id="rssFeed"
              className={mergeClasses(
                'absolute start-2 top-2 z-10',
                'flex items-center justify-center rounded-full border border-white/10 bg-white/10 shadow-lg backdrop-blur-md'
              )}
              style={{ width: '1.5rem', height: '1.5rem' }}
            >
              <span className="text-orange-500">
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 11a9 9 0 0 1 9 9" />
                  <path d="M4 4a16 16 0 0 1 16 16" />
                  <circle cx="5" cy="19" r="1" />
                </svg>
              </span>
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
            {displaySortLine && (
              <p cy-id="detailBottomSortLine" className="truncate text-gray-400" style={{ fontSize: '0.8em' }}>
                {displaySortLine}
              </p>
            )}
          </div>
        ) : (
          // Standard view footer (shiny black placard)
          <MediaCardStandardFooter displayTitle={displayTitle} fontSize={labelFontSize} width="12em" />
        )
      }
    />
  )
}

/**
 * Memoized SeriesCard component to prevent unnecessary re-renders.
 */
const MemoizedSeriesCard = memo(SeriesCard)

export { MemoizedSeriesCard as SeriesCard }

export default MemoizedSeriesCard
