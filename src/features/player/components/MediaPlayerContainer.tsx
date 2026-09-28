'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Clock, X } from 'lucide-react'
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
import IconBtn from '../../../shared/ui/IconBtn'
import PreviewCover from '../../metadata/components/PreviewCover'
import PlayerControls from './PlayerControls'
import PlayerTrackBar from './PlayerTrackBar'

export default function MediaPlayerContainer() {
  const { streamLibraryItem, clearStreamMedia, playerHandler, playerQueueItems, playItem } = useMediaContext()

  useAudioPlayerHotkeys(playerHandler.state, playerHandler.controls, !!streamLibraryItem, clearStreamMedia)

  const coverAspectRatio = 1
  const coverUrl = streamLibraryItem ? getLibraryItemCoverUrl(streamLibraryItem.id, streamLibraryItem.updatedAt) : null
  const dominantColor = useImageColor(coverUrl)

  // ── Terminal states: advance the queue, or tear the bar down ───────────────
  //
  // This component owns the end of playback, because tearing down is half
  // `closePlayer()` (which usePlayerHandler does not and must not do) and half
  // `clearStreamMedia()` (which only lives here). Doing only one half is what
  // left the bar stranded: the state was reset to IDLE while `streamLibraryItem`
  // stayed set, so the UI showed a finished book whose Play button called
  // playPause() on a destroyed player — no sound, no toast, no error.
  useEffect(() => {
    if (playerHandler.state.playerState !== PlayerState.FINISHED) return
    if (!streamLibraryItem) return

    const currentIndex = playerQueueItems.findIndex((q) => q.libraryItemId === streamLibraryItem.id)
    const next = playerQueueItems[currentIndex + 1]

    if (!next) {
      // End of the queue: close the server session AND clear the stream state,
      // so the bar animates out instead of becoming an inert control.
      void clearStreamMedia()
      return
    }

    // We only have the queue metadata here; fetch the full LibraryItem via the
    // existing server action which re-uses the already-loaded item cache.
    getExpandedLibraryItemAction(next.libraryItemId)
      .then((item) => playItem({ libraryItem: item, episodeId: next.episodeId }))
      .catch((err) => {
        console.error('[MediaPlayerContainer] Auto-advance failed:', err)
        // The next item could not be loaded, so the queue cannot continue.
        // Clear rather than strand the bar on a book that has already finished.
        void clearStreamMedia()
      })
  }, [playerHandler.state.playerState, streamLibraryItem, playerQueueItems, playItem, clearStreamMedia])

  // A fatal playback error is terminal too: the toast explains what happened, and
  // the bar must not survive it. Same reason as above — IDLE alone is not enough
  // to unmount, because IDLE is also the pre-load and post-close state.
  useEffect(() => {
    if (playerHandler.state.playerState !== PlayerState.ERROR) return
    void clearStreamMedia()
  }, [playerHandler.state.playerState, clearStreamMedia])

  if (!streamLibraryItem) return null

  const bookDuration = (streamLibraryItem.media as BookMedia).duration
  const bookAuthors =
    'authors' in streamLibraryItem.media.metadata ? streamLibraryItem.media.metadata.authors || [] : []
  const displayTitle = playerHandler.state.displayTitle || streamLibraryItem.media.metadata.title

  return (
    <AnimatePresence>
      <motion.div
        key="media-player"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={{
          willChange: 'transform, opacity',
          background: dominantColor
            ? `linear-gradient(to top, var(--background) 40%, ${dominantColor}22 100%)`
            : undefined,
        }}
        className="glassmorphism border-primary/20 fixed right-0 bottom-0 left-0 z-50 h-48 w-full border-t px-2 pt-2 pb-1 shadow-[0_-8px_30px_rgb(0,0,0,0.3)] transition-colors duration-1000 lg:h-40 lg:px-4 lg:pb-4"
      >
        <div className="absolute top-4 left-4 flex gap-4 lg:left-6">
          <div className="overflow-hidden rounded-md shadow-lg ring-1 ring-white/10 transition-transform duration-300 hover:scale-105 hover:shadow-xl">
            <PreviewCover
              src={coverUrl || ''}
              bookCoverAspectRatio={coverAspectRatio}
              showResolution={false}
              width={72}
              priority={true}
            />
          </div>
          <div className="flex max-w-[200px] flex-col gap-0.5 sm:max-w-[400px]">
            <Link
              href={`/library/${streamLibraryItem.libraryId}/item/${streamLibraryItem.id}`}
              className="text-foreground hover:text-primary-foreground truncate text-lg font-semibold transition-colors"
            >
              {displayTitle}
            </Link>
            {bookAuthors.length > 0 && (
              <div className="text-foreground-muted truncate text-sm">
                {bookAuthors.map((author, index) => (
                  <Fragment key={author.id}>
                    <Link
                      href={`/library/${streamLibraryItem.libraryId}/authors/${author.id}`}
                      className="hover:text-foreground transition-colors"
                    >
                      {author.name}
                    </Link>
                    {index < bookAuthors.length - 1 && <span>, </span>}
                  </Fragment>
                ))}
              </div>
            )}
            {bookDuration && (
              <div className="text-foreground-muted/60 mt-1 flex items-center gap-1.5 text-xs font-medium">
                <Clock size={12} className="opacity-70" />
                {secondsToTimestamp(bookDuration)}
              </div>
            )}
            {/* Queue indicator */}
            {playerQueueItems.length > 1 && (
              <p className={mergeClasses('mt-1 text-[10px]', 'text-foreground-muted/50')}>
                {playerQueueItems.findIndex((q) => q.libraryItemId === streamLibraryItem.id) + 1} /{' '}
                {playerQueueItems.length} in queue
              </p>
            )}
          </div>
        </div>

        <div className="mt-1 flex flex-col gap-4">
          <PlayerControls playerHandler={playerHandler} />
          <PlayerTrackBar playerHandler={playerHandler} />
        </div>

        <div className="absolute top-4 right-4 flex items-center gap-2 lg:right-6">
          <IconBtn
            size="small"
            borderless
            onClick={clearStreamMedia}
            whileHover={{ rotate: 90, scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            icon={X}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
