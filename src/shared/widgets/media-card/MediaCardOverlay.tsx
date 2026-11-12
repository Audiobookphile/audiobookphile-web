import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, BookOpen, CheckCircle2, Circle, Edit2, Globe, Pause, Play, Rss } from 'lucide-react'
import { type ReactNode, useCallback, useMemo } from 'react'
import { useUser } from '@/shared/contexts/UserContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { mergeClasses } from '@/shared/lib/merge-classes'
import IconBtn from '@/shared/ui/IconBtn'
import Tooltip from '@/shared/ui/Tooltip'
import LoadingSpinner from '@/shared/widgets/LoadingSpinner'
import MediaCardMoreMenu, { MediaCardMoreMenuItem } from '@/shared/widgets/media-card/MediaCardMoreMenu'
import MediaOverlayIconBtn from '@/shared/widgets/media-card/MediaOverlayIconBtn'
import type { MediaItemShare, RssFeed } from '@/types/api'

/**
 * Safely renders a render function with error boundary handling.
 * Prevents crashes from external render prop errors.
 */
function safeRender(fn: (() => ReactNode) | undefined, errorMessage: string): ReactNode {
  if (!fn) return null
  try {
    return fn()
  } catch (error) {
    console.error(errorMessage, error)
    return null
  }
}

// Layout constants
const ICON_SIZE = {
  SMALL: 1.5,
  ERROR_BADGE_HEIGHT: 1.5,
  ERROR_BADGE_WIDTH: 2.5,
  ERROR_ICON: 0.875,
} as const

const SPACING = {
  CORNER: 0.375,
  RSS_SHARE_GAP: 2.125,
} as const

interface MediaCardOverlayProps {
  isHovering: boolean
  isSelectionMode: boolean
  selected: boolean
  processing: boolean
  isPending: boolean
  isMoreMenuOpen: boolean
  showPlayButton: boolean
  showReadButton: boolean
  isItemPlaying?: boolean
  showEditButton?: boolean
  playIconFontSize: number
  moreMenuItems: MediaCardMoreMenuItem[]
  rssFeed: RssFeed | null
  mediaItemShare: MediaItemShare | null
  showError: boolean
  errorText: string
  showSelectRadioButton?: boolean
  renderOverlayBadges?: () => ReactNode
  renderBadges?: (props: { isHovering: boolean; isSelectionMode: boolean; processing: boolean }) => ReactNode
  renderSeriesNameOverlay?: (isHovering: boolean) => ReactNode
  onPlay: () => void
  onRead: () => void
  onEdit?: () => void
  onMoreAction: (action: string, data?: Record<string, string>) => void
  onMoreMenuOpenChange: (isOpen: boolean) => void
  onSelect?: (event: React.MouseEvent) => void
}

export default function MediaCardOverlay({
  isHovering,
  isSelectionMode,
  selected,
  processing,
  isPending,
  isMoreMenuOpen,
  showPlayButton,
  showReadButton,
  isItemPlaying = false,
  showEditButton = true,
  playIconFontSize,
  moreMenuItems,
  rssFeed,
  mediaItemShare,
  showError,
  errorText,
  showSelectRadioButton = false,
  renderOverlayBadges,
  renderBadges,
  renderSeriesNameOverlay,
  onPlay,
  onRead,
  onEdit,
  onMoreAction,
  onMoreMenuOpenChange,
  onSelect,
}: MediaCardOverlayProps) {
  const { userCanUpdate } = useUser()
  const showOverlay = (isHovering || isSelectionMode || isMoreMenuOpen) && !processing

  const t = useTypeSafeTranslations()

  const isProcessingOrPending = useMemo(() => processing || isPending, [processing, isPending])

  const overlayWrapperClasslist = useMemo(
    () =>
      mergeClasses(
        isSelectionMode ? 'bg-black/60' : 'bg-gradient-to-t from-black/80 via-black/40 to-black/60 backdrop-blur-[2px]',
        selected && 'ring-2 ring-primary ring-inset'
      ),
    [isSelectionMode, selected]
  )

  const handlePlayClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
      event.preventDefault()
      event.stopPropagation()
      onPlay()
    },
    [onPlay]
  )

  const handleReadClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
      event.preventDefault()
      event.stopPropagation()
      onRead()
    },
    [onRead]
  )

  const handleSelectClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      onSelect?.(event)
    },
    [onSelect]
  )

  const handleEditClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      onEdit?.()
    },
    [onEdit]
  )

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ willChange: 'opacity' }}
            cy-id="overlay"
            className={mergeClasses(
              'absolute start-0 top-0 z-10 h-full w-full overflow-hidden rounded-lg md:block',
              overlayWrapperClasslist
            )}
          >
            {/* Play/Read center interaction */}
            {(showPlayButton || showReadButton) && (
              <div className="pointer-events-none flex h-full items-center justify-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  style={{ willChange: 'transform, opacity' }}
                  className="pointer-events-auto"
                >
                  {showPlayButton ? (
                    <IconBtn
                      borderless
                      outlined={false}
                      className="h-auto w-auto text-white drop-shadow-2xl"
                      onClick={handlePlayClick}
                      ariaLabel={isItemPlaying ? t('ButtonPlaying') : t('ButtonPlay')}
                      icon={isItemPlaying ? Pause : Play}
                      style={{ transform: `scale(${playIconFontSize * 0.45})` }}
                      whileHover={{ scale: 1.1, color: '#fff' }}
                      whileTap={{ scale: 0.9 }}
                    />
                  ) : showReadButton ? (
                    <IconBtn
                      borderless
                      className="h-auto w-auto text-white drop-shadow-2xl"
                      onClick={handleReadClick}
                      ariaLabel={t('ButtonRead')}
                      icon={BookOpen}
                      style={{ transform: `scale(${playIconFontSize * 0.45})` }}
                      whileHover={{ scale: 1.1, color: '#fff' }}
                      whileTap={{ scale: 0.9 }}
                    />
                  ) : null}
                </motion.div>
              </div>
            )}

            {/* Select button */}
            {showSelectRadioButton && (
              <MediaOverlayIconBtn
                cyId="selectedRadioButton"
                position="top-start"
                icon={selected ? CheckCircle2 : Circle}
                onClick={handleSelectClick}
                ariaLabel={selected ? t('ButtonDeselect') : t('ButtonSelect')}
                selected={selected}
                className={selected ? '!border-primary !bg-primary !text-black' : ''}
              />
            )}

            {/* Edit button */}
            {showEditButton && userCanUpdate && !isSelectionMode && (
              <MediaOverlayIconBtn
                cyId="editButton"
                position="top-end"
                icon={Edit2}
                onClick={handleEditClick}
                ariaLabel={t('ButtonEdit')}
              />
            )}

            {/* More menu icon */}
            {!isSelectionMode && moreMenuItems.length > 0 && (
              <motion.div
                cy-id="moreButton"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.1 }}
                className="absolute end-[0.5em] bottom-[0.5em] cursor-pointer md:block"
              >
                <MediaCardMoreMenu
                  items={moreMenuItems}
                  processing={isProcessingOrPending}
                  onAction={onMoreAction}
                  onOpenChange={onMoreMenuOpenChange}
                />
              </motion.div>
            )}

            {/* Overlay badges (e.g., ebook format) */}
            {safeRender(renderOverlayBadges, 'Error rendering overlay badges:')}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Processing overlay */}
      <AnimatePresence>
        {processing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            cy-id="loadingSpinner"
            className="absolute start-0 top-0 z-20 flex h-full w-full items-center justify-center rounded-lg bg-black/60 backdrop-blur-md"
          >
            <LoadingSpinner size="la-lg" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error tooltip */}
      {showError && (
        <Tooltip
          text={errorText}
          position="right"
          usePortal
          className="absolute start-0 bottom-4 z-10"
          tooltipClassName="whitespace-nowrap"
        >
          <div
            className={mergeClasses(
              'bg-error/90 flex items-center justify-end rounded-r-full shadow-lg backdrop-blur-md',
              'border-y border-r border-white/20'
            )}
            style={{ height: `${ICON_SIZE.ERROR_BADGE_HEIGHT}em`, width: `${ICON_SIZE.ERROR_BADGE_WIDTH}em` }}
          >
            <AlertCircle size={14} className="pr-1 text-white" />
          </div>
        </Tooltip>
      )}

      {/* RSS feed & share icons */}
      {rssFeed && !isSelectionMode && !isHovering && (
        <div
          cy-id="rssFeed"
          className={mergeClasses(
            'absolute start-[0.5em] top-[0.5em] z-10',
            'flex items-center justify-center rounded-lg border border-white/10 bg-black/60 shadow-sm backdrop-blur-md'
          )}
          style={{ width: `${ICON_SIZE.SMALL}em`, height: `${ICON_SIZE.SMALL}em` }}
        >
          <Rss size={14} className="fill-current text-primary" aria-hidden="true" />
        </div>
      )}
      {mediaItemShare && !isSelectionMode && !isHovering && (
        <div
          cy-id="mediaItemShare"
          className={mergeClasses(
            'absolute start-[0.5em] z-10',
            'flex items-center justify-center rounded-lg border border-white/10 bg-black/60 shadow-sm backdrop-blur-md'
          )}
          style={{
            width: `${ICON_SIZE.SMALL}em`,
            height: `${ICON_SIZE.SMALL}em`,
            top: rssFeed ? `${SPACING.RSS_SHARE_GAP}em` : `${SPACING.CORNER}em`,
          }}
        >
          <Globe size={14} className="text-success" aria-hidden="true" />
        </div>
      )}

      {/* Type-specific badges (books/podcasts) */}
      {safeRender(
        () => renderBadges?.({ isHovering, isSelectionMode, processing: isProcessingOrPending }),
        'Error rendering badges:'
      )}

      {/* Series name overlay */}
      {safeRender(() => renderSeriesNameOverlay?.(isHovering), 'Error rendering series name overlay:')}
    </>
  )
}
