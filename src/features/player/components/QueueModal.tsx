'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Clock, GripVertical, ListMusic, Music2, Play, Trash2, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { getExpandedLibraryItemAction } from '@/features/player/actions/mediaActions'
import { type PlayerQueueItem, useMediaContext } from '@/features/player/contexts/MediaContext'
import { calculateQueueMetrics } from '@/features/player/lib/queue'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { formatDurationHuman, secondsToTimestamp } from '@/shared/lib/datefns'
import { mergeClasses } from '@/shared/lib/merge-classes'
import Modal from '@/shared/modals/Modal'

interface QueueModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function QueueModal({ isOpen, onClose }: QueueModalProps) {
  const t = useTypeSafeTranslations()
  const {
    playerQueueItems,
    streamLibraryItem,
    removeItemFromQueue,
    clearQueue,
    playItem,
    moveQueueItem,
    playerHandler,
  } = useMediaContext()

  const [loadingItemId, setLoadingItemId] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const metrics = useMemo(() => {
    return calculateQueueMetrics(
      playerQueueItems,
      streamLibraryItem?.id,
      playerHandler.state.currentTime
    )
  }, [playerQueueItems, streamLibraryItem?.id, playerHandler.state.currentTime])

  // Current playing item (first in queue matching streamLibraryItem or first item)
  const currentItem = playerQueueItems.find(
    (item) => item.libraryItemId === streamLibraryItem?.id
  ) || playerQueueItems[0]

  // Up next items: everything after current or all non-current
  const currentIndex = currentItem
    ? playerQueueItems.findIndex((item) => item.libraryItemId === currentItem.libraryItemId)
    : -1

  const upNextItems = currentIndex >= 0
    ? playerQueueItems.slice(currentIndex + 1)
    : playerQueueItems.slice(1)

  const handleMove = useCallback(
    (fromUpNextIndex: number, toUpNextIndex: number) => {
      const startIndex = currentIndex >= 0 ? currentIndex + 1 : 1
      const actualFrom = startIndex + fromUpNextIndex
      const actualTo = startIndex + toUpNextIndex
      moveQueueItem(actualFrom, actualTo)
    },
    [currentIndex, moveQueueItem]
  )

  const handlePlayNow = useCallback(
    async (item: PlayerQueueItem) => {
      setLoadingItemId(item.libraryItemId)
      try {
        const fullItem = await getExpandedLibraryItemAction(item.libraryItemId)
        await playItem({
          libraryItem: fullItem,
          episodeId: item.episodeId,
        })
      } catch (err) {
        console.error('[QueueModal] Failed to play queued item:', err)
      } finally {
        setLoadingItemId(null)
      }
    },
    [playItem]
  )

  const handleRemove = useCallback(
    (item: PlayerQueueItem) => {
      removeItemFromQueue({
        libraryItemId: item.libraryItemId,
        episodeId: item.episodeId,
      })
    },
    [removeItemFromQueue]
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="sm:max-w-lg md:max-w-xl">
      <div className="flex max-h-[85vh] flex-col p-5">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/30">
              <ListMusic className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {t('HeaderPlayerQueue') || 'Playback Queue'}
              </h2>
              <p className="text-xs text-foreground-muted">
                {playerQueueItems.length} {playerQueueItems.length === 1 ? 'item' : 'items'} in queue
                {metrics.remainingDuration > 0 && ` • ${formatDurationHuman(metrics.remainingDuration)} remaining`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {upNextItems.length > 0 && (
              <button
                type="button"
                onClick={clearQueue}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-foreground-muted transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
              >
                Clear Queue
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-foreground-muted transition-colors hover:bg-white/10 hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex flex-col gap-4 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
          {/* Currently Playing Card */}
          {currentItem && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold tracking-wider text-accent uppercase">
                Now Playing
              </span>
              <div className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/10 to-primary/10 p-3 shadow-lg backdrop-blur-xl">
                {/* Cover art */}
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-black/40 shadow-md ring-1 ring-white/10">
                  <img
                    src={`/api/items/${currentItem.libraryItemId}/cover`}
                    alt={currentItem.title}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                  <div className="absolute inset-0 -z-10 flex items-center justify-center bg-white/5 text-foreground-muted">
                    <Music2 className="h-6 w-6 opacity-40" />
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-bold text-foreground">
                    {currentItem.title}
                  </span>
                  {currentItem.subtitle && (
                    <span className="truncate text-xs text-foreground-muted">
                      {currentItem.subtitle}
                    </span>
                  )}
                  {currentItem.duration !== null && (
                    <span className="mt-1 flex items-center gap-1 font-mono text-[11px] text-accent/80">
                      <Clock className="h-3 w-3" />
                      {secondsToTimestamp(currentItem.duration)}
                    </span>
                  )}
                </div>

                {/* Animated soundwave pill */}
                <div className="flex items-center gap-0.5 px-2 py-1">
                  <span className="h-3 w-1 animate-pulse rounded-full bg-accent" />
                  <span className="h-5 w-1 animate-pulse rounded-full bg-accent delay-75" />
                  <span className="h-2 w-1 animate-pulse rounded-full bg-accent delay-150" />
                </div>
              </div>
            </div>
          )}

          {/* Up Next Section */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold tracking-wider text-foreground-muted/70 uppercase">
              Up Next ({upNextItems.length})
            </span>

            {upNextItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-8 text-center">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-foreground-muted">
                  <Music2 className="h-5 w-5 opacity-60" />
                </div>
                <p className="text-sm font-semibold text-foreground">Your queue is empty</p>
                <p className="mt-1 max-w-xs text-xs text-foreground-muted">
                  Use &quot;Add to Queue&quot; on any book or episode to line up what you want to hear next.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <AnimatePresence initial={false}>
                  {upNextItems.map((item, index) => {
                    const isLoading = loadingItemId === item.libraryItemId
                    const isDragging = draggedIndex === index
                    const isDragOver = dragOverIndex === index && draggedIndex !== index

                    return (
                      <motion.div
                        key={`${item.libraryItemId}-${item.episodeId || 'main'}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move'
                            e.dataTransfer.setData('text/plain', String(index))
                            setDraggedIndex(index)
                          }}
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.dataTransfer.dropEffect = 'move'
                            if (dragOverIndex !== index) {
                              setDragOverIndex(index)
                            }
                          }}
                          onDragLeave={() => {
                            if (dragOverIndex === index) {
                              setDragOverIndex(null)
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault()
                            if (draggedIndex !== null && draggedIndex !== index) {
                              handleMove(draggedIndex, index)
                            }
                            setDraggedIndex(null)
                            setDragOverIndex(null)
                          }}
                          onDragEnd={() => {
                            setDraggedIndex(null)
                            setDragOverIndex(null)
                          }}
                          className={mergeClasses(
                            'group relative flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] p-2.5 transition-all hover:border-white/15 hover:bg-white/[0.06]',
                            isLoading && 'opacity-60 pointer-events-none',
                            isDragging && 'opacity-35 scale-[0.98] border-primary/40 bg-primary/5',
                            isDragOver && 'border-primary ring-1 ring-primary/40 bg-primary/10 shadow-lg shadow-primary/10'
                          )}
                        >
                        {/* Drag grip handle */}
                        <div
                          className="flex h-7 w-5 shrink-0 cursor-grab items-center justify-center text-foreground-muted/40 transition-colors hover:text-foreground-muted active:cursor-grabbing"
                          title="Drag to reorder"
                          aria-label="Drag to reorder"
                        >
                          <GripVertical className="h-4 w-4" />
                        </div>

                        {/* Position badge */}
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/5 font-mono text-xs font-bold text-foreground-muted">
                          {index + 1}
                        </span>

                        {/* Thumbnail */}
                        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-black/40 ring-1 ring-white/10">
                          <img
                            src={`/api/items/${item.libraryItemId}/cover`}
                            alt={item.title}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                          <div className="absolute inset-0 -z-10 flex items-center justify-center bg-white/5 text-foreground-muted">
                            <Music2 className="h-4 w-4 opacity-40" />
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                            {item.title}
                          </span>
                          {item.subtitle && (
                            <span className="truncate text-[11px] text-foreground-muted">
                              {item.subtitle}
                            </span>
                          )}
                          {item.duration !== null && (
                            <span className="mt-0.5 flex items-center gap-1 font-mono text-[10px] text-foreground-muted/70">
                              <Clock className="h-2.5 w-2.5" />
                              {secondsToTimestamp(item.duration)}
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handlePlayNow(item)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-primary/20 text-primary transition-all hover:scale-105 hover:bg-primary hover:text-white"
                            title="Play Now"
                            aria-label={`Play ${item.title}`}
                          >
                            <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(item)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
                            title="Remove from Queue"
                            aria-label={`Remove ${item.title} from queue`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
