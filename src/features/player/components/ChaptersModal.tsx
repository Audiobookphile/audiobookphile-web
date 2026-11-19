'use client'

import { ArrowUpDown, ListMusic, Search, Share2, X } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { UsePlayerHandlerReturn } from '@/features/player/hooks/usePlayerHandler'
import { useGlobalToast } from '@/shared/contexts/ToastContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { secondsToTimestamp } from '@/shared/lib/datefns'
import { copyChapterTimestampLink } from '@/shared/lib/chapterLink'
import { mergeClasses } from '@/shared/lib/merge-classes'
import Modal from '@/shared/modals/Modal'
import type { Chapter } from '@/types/api'

interface ChaptersModalProps {
  isOpen: boolean
  playerHandler: UsePlayerHandlerReturn
  onClose: () => void
}

interface ChapterRowProps {
  chapter: Chapter
  isCurrentChapter: boolean
  isListened: boolean
  isFocused?: boolean
  currentTime?: number
  onSeek: (time: number) => void
  onShareChapter?: (chapter: Chapter) => void
}

/**
 * Pure filter helper for chapters searching by title or chapter number.
 */
export function filterChapters(chapters: Chapter[], query: string): Chapter[] {
  const q = query.trim().toLowerCase()
  if (!q) return chapters
  return chapters.filter(
    (ch) =>
      ch.title.toLowerCase().includes(q) ||
      (ch.id + 1).toString() === q ||
      `chapter ${ch.id + 1}`.toLowerCase().includes(q)
  )
}

/**
 * Pure sort helper reversing chapter order when enabled.
 */
export function sortChapters(chapters: Chapter[], reversed: boolean): Chapter[] {
  return reversed ? [...chapters].reverse() : chapters
}

const ChapterRow = memo(function ChapterRow({
  chapter,
  isCurrentChapter,
  isListened,
  isFocused = false,
  currentTime,
  onSeek,
  onShareChapter,
}: ChapterRowProps) {
  const startTimestamp = secondsToTimestamp(chapter.start)
  const duration = Math.max(0, chapter.end - chapter.start)
  const durationTimestamp = secondsToTimestamp(duration)

  const remainingInChapter =
    isCurrentChapter && currentTime != null ? Math.max(0, chapter.end - currentTime) : 0
  const progressPercent =
    isCurrentChapter && currentTime != null && duration > 0
      ? Math.min(100, Math.max(0, ((currentTime - chapter.start) / duration) * 100))
      : 0

  const handleClick = useCallback(() => {
    onSeek(chapter.start)
  }, [onSeek, chapter.start])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSeek(chapter.start)
      }
    },
    [onSeek, chapter.start]
  )

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={mergeClasses(
        'flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-all duration-150 cursor-pointer',
        'hover:bg-white/5 focus:bg-white/5 focus:outline-none',
        isCurrentChapter && 'bg-accent/15 border-accent border-l-4 shadow-xs',
        isListened && !isCurrentChapter && 'bg-success/5',
        isFocused && 'ring-2 ring-accent/60 bg-white/10'
      )}
      data-current={isCurrentChapter}
      data-focused={isFocused}
    >
      {/* Chapter number indicator */}
      <div
        className={mergeClasses(
          'grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs leading-none font-semibold shadow-xs',
          isCurrentChapter
            ? 'bg-accent text-primary'
            : isListened
              ? 'bg-success/20 text-success'
              : 'border border-white/10 bg-white/5 text-foreground-muted'
        )}
      >
        {chapter.id + 1}
      </div>

      {/* Chapter info */}
      <div className="min-w-0 flex-1">
        <p
          dir="auto"
          className={mergeClasses(
            'truncate text-sm font-semibold tracking-tight',
            isCurrentChapter ? 'text-accent' : isListened ? 'text-foreground/85' : 'text-foreground'
          )}
        >
          {chapter.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-foreground-muted">
          <span className="font-mono">{startTimestamp}</span>
          <span className="font-mono text-foreground-muted/60">({durationTimestamp})</span>
          {isCurrentChapter && (
            <span className="inline-flex items-center rounded-md bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent ring-1 ring-accent/30">
              -{secondsToTimestamp(remainingInChapter)} left
            </span>
          )}
        </div>
        {isCurrentChapter && (
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Chapter share link button */}
      {onShareChapter && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onShareChapter(chapter)
          }}
          className="shrink-0 rounded-lg p-1.5 text-foreground-muted hover:bg-white/10 hover:text-accent focus:bg-white/10 focus:text-accent transition-colors cursor-pointer"
          title={`Copy link for ${chapter.title}`}
          aria-label={`Copy link for ${chapter.title}`}
        >
          <Share2 className="h-4 w-4" />
        </button>
      )}
    </button>
  )
})

export default function ChaptersModal({ isOpen, playerHandler, onClose }: ChaptersModalProps) {
  const t = useTypeSafeTranslations()
  const { showToast } = useGlobalToast()
  const listRef = useRef<HTMLDivElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isReversed, setIsReversed] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)

  const { chapters, currentChapter } = playerHandler.state
  const { seek } = playerHandler.controls

  const handleShareChapter = useCallback(
    async (chapter: Chapter) => {
      try {
        await copyChapterTimestampLink({ chapter })
        showToast(`${t('ButtonCopiedToClipboard')} (${chapter.title})`, { type: 'success' })
      } catch (err) {
        console.error('Failed to copy chapter link', err)
      }
    },
    [showToast, t]
  )

  // Reset search filter and navigation state when modal is opened/closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setIsReversed(false)
      setFocusedIndex(-1)
    }
  }, [isOpen])

  // Filter and sort chapters based on search query and reverse order
  const displayedChapters = useMemo(() => {
    const filtered = filterChapters(chapters, searchQuery)
    return sortChapters(filtered, isReversed)
  }, [chapters, searchQuery, isReversed])

  // Keyboard navigation through chapters (ArrowDown/ArrowUp and Enter to seek)
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (displayedChapters.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((prev) => (prev + 1) % displayedChapters.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((prev) => (prev - 1 + displayedChapters.length) % displayedChapters.length)
      } else if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < displayedChapters.length) {
        e.preventDefault()
        seek(displayedChapters[focusedIndex].start)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, displayedChapters, focusedIndex, seek])

  // Scroll to focused chapter during keyboard navigation
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.querySelector('[data-focused="true"]')
      if (focusedElement) {
        focusedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
      }
    }
  }, [focusedIndex])

  // Scroll to current chapter when modal opens
  useEffect(() => {
    if (isOpen && listRef.current && currentChapter && !searchQuery) {
      requestAnimationFrame(() => {
        const currentElement = listRef.current?.querySelector('[data-current="true"]')
        if (currentElement) {
          currentElement.scrollIntoView({
            behavior: 'instant',
            block: 'center',
          })
        }
      })
    }
  }, [isOpen, currentChapter, searchQuery])

  const handleSeek = (time: number) => {
    seek(time)
  }

  const currentChapterId = currentChapter?.id ?? -1

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="sm:max-w-lg md:max-w-lg lg:max-w-lg">
      <div className="flex max-h-[80vh] flex-col p-4">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <ListMusic className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">
              {t('LabelChapters') || 'Chapters'}
            </h2>
            {chapters.length > 0 && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
                {searchQuery ? `${displayedChapters.length} of ${chapters.length}` : chapters.length}
              </span>
            )}
          </div>
        </div>

        {/* Real-time Chapter Search Filter & Sort Toggle */}
        <div className="mb-3 flex items-center gap-2">
          {chapters.length > 3 ? (
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setFocusedIndex(-1)
                }}
                placeholder="Search chapters by title or number..."
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-8 text-sm text-foreground outline-none transition-all placeholder:text-foreground-muted/50 focus:border-accent/50 focus:bg-white/10 focus:ring-1 focus:ring-accent/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setFocusedIndex(-1)
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-foreground-muted hover:bg-white/10 hover:text-foreground transition-colors cursor-pointer"
                  aria-label="Clear chapter search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {chapters.length > 1 && (
            <button
              type="button"
              onClick={() => {
                setIsReversed((prev) => !prev)
                setFocusedIndex(-1)
              }}
              className={mergeClasses(
                'flex h-9.5 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-all active:scale-95 cursor-pointer',
                isReversed
                  ? 'border-accent bg-accent/20 text-accent ring-1 ring-accent/30'
                  : 'border-white/10 bg-white/5 text-foreground-muted hover:border-white/20 hover:text-foreground'
              )}
              title={isReversed ? 'Reverse order (Newest first)' : 'Standard order (Oldest first)'}
              aria-label="Toggle chapter order"
            >
              <ArrowUpDown className="h-4 w-4" />
              <span className="hidden sm:inline">{isReversed ? 'Newest' : 'Oldest'}</span>
            </button>
          )}
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
          {chapters.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-foreground-muted">
              <p>{t('MessageNoChapters')}</p>
            </div>
          ) : displayedChapters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-foreground-muted">
              <Search className="mb-2 h-7 w-7 text-foreground-muted/30" />
              <p className="text-sm font-medium">No chapters match &ldquo;{searchQuery}&rdquo;</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs font-semibold text-accent hover:underline cursor-pointer"
              >
                Clear filter
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {displayedChapters.map((chapter, idx) => {
                const isCurrentChapter = chapter.id === currentChapterId
                const isListened = chapter.id < currentChapterId

                return (
                  <ChapterRow
                    key={chapter.id}
                    chapter={chapter}
                    isCurrentChapter={isCurrentChapter}
                    isListened={isListened}
                    isFocused={idx === focusedIndex}
                    currentTime={playerHandler.state.currentTime}
                    onSeek={handleSeek}
                    onShareChapter={handleShareChapter}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
