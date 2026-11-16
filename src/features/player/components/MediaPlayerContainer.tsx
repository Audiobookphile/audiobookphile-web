'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import Link from 'next/link'
import { Fragment, useEffect } from 'react'
import { getExpandedLibraryItemAction } from '@/features/player/actions/mediaActions'
import { useMediaContext } from '@/features/player/contexts/MediaContext'
import { useAudioPlayerHotkeys } from '@/features/player/hooks/useAudioPlayerHotkeys'
import { useImageColor } from '@/shared/hooks/useImageColor'
import { getLibraryItemCoverUrl } from '@/shared/lib/coverUtils'
import { secondsToTimestamp } from '@/shared/lib/datefns'
import { mergeClasses } from '@/shared/lib/merge-classes'
import { BookMedia, PlayerState } from '@/types/api'
import PreviewCover from '../../metadata/components/PreviewCover'
import { PlayerRightControls, PlayerTransportControls } from './PlayerControls'
import PlayerTrackBar from './PlayerTrackBar'

export default function MediaPlayerContainer() {
  const { streamLibraryItem, clearStreamMedia, playerHandler, playerQueueItems, playItem } = useMediaContext()

  useAudioPlayerHotkeys(playerHandler.state, playerHandler.controls, !!streamLibraryItem, clearStreamMedia)

  const coverAspectRatio = 1
  const coverUrl = streamLibraryItem ? getLibraryItemCoverUrl(streamLibraryItem.id, streamLibraryItem.updatedAt) : null
  const dominantColor = useImageColor(coverUrl)

  // ── Terminal states: advance the queue, or tear the bar down ───────────────
  useEffect(() => {
    if (playerHandler.state.playerState !== PlayerState.FINISHED) return
    if (!streamLibraryItem) return

    const currentIndex = playerQueueItems.findIndex((q) => q.libraryItemId === streamLibraryItem.id)
    const next = playerQueueItems[currentIndex + 1]

    if (!next) {
      clearStreamMedia()
      return
    }

    getExpandedLibraryItemAction(next.libraryItemId)
      .then((item) => playItem({ libraryItem: item, episodeId: next.episodeId }))
      .catch((err) => {
        console.error('[MediaPlayerContainer] Auto-advance failed:', err)
        clearStreamMedia()
      })
  }, [playerHandler.state.playerState, streamLibraryItem, playerQueueItems, playItem, clearStreamMedia])

  useEffect(() => {
    if (playerHandler.state.playerState !== PlayerState.ERROR) return
    clearStreamMedia()
  }, [playerHandler.state.playerState, clearStreamMedia])

  const bookDuration = streamLibraryItem ? (streamLibraryItem.media as BookMedia).duration : undefined
  const bookAuthors =
    streamLibraryItem && 'authors' in streamLibraryItem.media.metadata
      ? streamLibraryItem.media.metadata.authors || []
      : []
  const displayTitle = streamLibraryItem
    ? playerHandler.state.displayTitle || streamLibraryItem.media.metadata.title
    : ''

  return (
    <AnimatePresence>
      {streamLibraryItem && (
        <motion.div
          key="media-player"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 220 }}
          style={{
            willChange: 'transform, opacity',
            background: dominantColor
              ? `linear-gradient(to top, var(--background) 55%, ${dominantColor}1c 100%)`
              : undefined,
          }}
          className="glassmorphism fixed right-0 bottom-0 left-0 z-50 w-full border-t border-white/10 bg-background/92 px-3 py-2 shadow-[0_-10px_35px_rgba(0,0,0,0.35)] backdrop-blur-2xl transition-colors duration-700 sm:px-4 lg:px-6 lg:py-2.5"
        >
          {/* Main 3-Column Studio Audio Layout */}
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 sm:gap-4 lg:gap-6">
            {/* Left Column: Cover & Book Metadata */}
            <div className="flex min-w-0 max-w-[200px] items-center gap-2.5 sm:max-w-[260px] lg:max-w-[320px] shrink-0">
              <div className="relative shrink-0 overflow-hidden rounded-xl shadow-md ring-1 ring-white/15 transition-transform duration-300 hover:scale-105">
                <PreviewCover
                  src={coverUrl || ''}
                  bookCoverAspectRatio={coverAspectRatio}
                  showResolution={false}
                  width={50}
                  priority={true}
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <Link
                  href={`/library/${streamLibraryItem.libraryId}/item/${streamLibraryItem.id}`}
                  className="truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
                  title={displayTitle}
                >
                  {displayTitle}
                </Link>
                {bookAuthors.length > 0 && (
                  <div className="truncate text-xs text-foreground-muted">
                    {bookAuthors.map((author, index) => (
                      <Fragment key={author.id}>
                        <Link
                          href={`/library/${streamLibraryItem.libraryId}/authors/${author.id}`}
                          className="transition-colors hover:text-foreground"
                        >
                          {author.name}
                        </Link>
                        {index < bookAuthors.length - 1 && <span>, </span>}
                      </Fragment>
                    ))}
                  </div>
                )}
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-foreground-muted/60">
                  {bookDuration && (
                    <span className="flex items-center gap-1 font-mono">
                      <Clock size={11} className="opacity-70" />
                      {secondsToTimestamp(bookDuration)}
                    </span>
                  )}
                  {playerQueueItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent('audiobookphile:toggle-queue'))}
                      className="cursor-pointer rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent transition-all hover:scale-105 hover:bg-accent hover:text-black"
                      title="Open Up Next queue (Q)"
                    >
                      Queue {playerQueueItems.findIndex((q) => q.libraryItemId === streamLibraryItem.id) + 1}/{playerQueueItems.length}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Center Column: Transport Controls & Scrubber */}
            <div className="flex min-w-0 flex-1 max-w-2xl flex-col items-center justify-center gap-0.5 px-1 sm:px-2">
              <PlayerTransportControls playerHandler={playerHandler} />
              <div className="w-full">
                <PlayerTrackBar playerHandler={playerHandler} />
              </div>
            </div>

            {/* Right Column: Audio Utilities & Dismiss */}
            <div className="flex items-center justify-end gap-1 sm:gap-2 shrink-0">
              <PlayerRightControls playerHandler={playerHandler} onClose={clearStreamMedia} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
