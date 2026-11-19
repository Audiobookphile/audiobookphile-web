'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Clock, Moon } from 'lucide-react'
import Link from 'next/link'
import { Fragment, useEffect, useRef, useState } from 'react'
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
import { formatSleepTimerRemaining } from './SleepTimerWidget'

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

  // Nightstand Dim Display for bedtime listening
  const isSleepTimerActive = playerHandler.state.sleepTimerRemaining !== null
  const isDimEnabled = Boolean(playerHandler.state.settings?.sleepTimerDimScreen)
  const shouldDim = isSleepTimerActive && isDimEnabled
  const [temporarilyAwake, setTemporarilyAwake] = useState(false)
  const wakeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!shouldDim) {
      setTemporarilyAwake(false)
      return
    }

    const handleUserActivity = () => {
      setTemporarilyAwake(true)
      if (wakeTimeoutRef.current) clearTimeout(wakeTimeoutRef.current)
      wakeTimeoutRef.current = setTimeout(() => {
        setTemporarilyAwake(false)
      }, 5000)
    }

    window.addEventListener('mousemove', handleUserActivity, { passive: true })
    window.addEventListener('keydown', handleUserActivity, { passive: true })
    window.addEventListener('touchstart', handleUserActivity, { passive: true })

    return () => {
      window.removeEventListener('mousemove', handleUserActivity)
      window.removeEventListener('keydown', handleUserActivity)
      window.removeEventListener('touchstart', handleUserActivity)
      if (wakeTimeoutRef.current) clearTimeout(wakeTimeoutRef.current)
    }
  }, [shouldDim])

  return (
    <AnimatePresence>
      {/* Nightstand Dim Display Overlay (Bedtime Listening) */}
      {shouldDim && !temporarilyAwake && (
        <motion.div
          key="nightstand-dim-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/92 backdrop-blur-sm cursor-pointer select-none"
          onClick={() => setTemporarilyAwake(true)}
        >
          <div className="flex flex-col items-center gap-3 text-center px-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border border-primary/25 shadow-lg shadow-primary/20">
              <Moon size={28} className="text-primary animate-pulse" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="font-mono text-4xl sm:text-5xl font-extrabold tabular-nums tracking-tight text-white/90">
                {formatSleepTimerRemaining(playerHandler.state.sleepTimerRemaining || 0)}
              </span>
              <span className="text-[11px] uppercase tracking-widest text-primary/80 font-bold">
                Sleep Timer Active
              </span>
            </div>
            <p className="max-w-xs truncate text-xs font-medium text-white/60">
              {displayTitle}
            </p>
            <div className="mt-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/40">
              Move mouse or press any key to wake
            </div>
          </div>
        </motion.div>
      )}

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
          {/* Dynamic Top Aura Highlight */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px]"
            style={{
              background: dominantColor
                ? `linear-gradient(90deg, transparent 0%, ${dominantColor}80 30%, ${dominantColor}cc 50%, ${dominantColor}80 70%, transparent 100%)`
                : 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
            }}
          />

          {/* Main 3-Column Studio Audio Layout */}
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 sm:gap-4 lg:gap-6">
            {/* Left Column: Cover & Book Metadata */}
            <div className="flex min-w-0 max-w-[200px] items-center gap-2.5 sm:max-w-[260px] lg:max-w-[320px] shrink-0">
              <Link
                href={`/library/${streamLibraryItem.libraryId}/item/${streamLibraryItem.id}`}
                className="group relative shrink-0 overflow-hidden rounded-xl ring-1 ring-white/15 transition-all duration-300 hover:scale-105 hover:ring-white/30"
                style={{
                  boxShadow: dominantColor
                    ? `0 6px 20px -2px ${dominantColor}45`
                    : '0 6px 16px -2px rgba(0,0,0,0.35)',
                }}
                title={displayTitle}
              >
                <PreviewCover
                  src={coverUrl || ''}
                  bookCoverAspectRatio={coverAspectRatio}
                  showResolution={false}
                  width={50}
                  priority={true}
                />
              </Link>
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
