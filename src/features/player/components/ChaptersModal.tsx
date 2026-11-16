'use client'

import { ListMusic, Search, X } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { UsePlayerHandlerReturn } from '@/features/player/hooks/usePlayerHandler'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { secondsToTimestamp } from '@/shared/lib/datefns'
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
  onSeek: (time: number) => void
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

const ChapterRow = memo(function ChapterRow({ chapter, isCurrentChapter, isListened, onSeek }: ChapterRowProps) {
  const startTimestamp = secondsToTimestamp(chapter.start)
  const duration = Math.max(0, chapter.end - chapter.start)
  const durationTimestamp = secondsToTimestamp(duration)

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
        'flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-all duration-150',
        'hover:bg-white/5 focus:bg-white/5 focus:outline-none',
        isCurrentChapter && 'bg-accent/15 border-accent border-l-4 shadow-xs',
        isListened && !isCurrentChapter && 'bg-success/5'
      )}
      data-current={isCurrentChapter}
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
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-foreground-muted">
          <span className="font-mono">{startTimestamp}</span>
          <span className="font-mono text-foreground-muted/60">({durationTimestamp})</span>
        </div>
      </div>
    </button>
  )
})

export default function ChaptersModal({ isOpen, playerHandler, onClose }: ChaptersModalProps) {
  const t = useTypeSafeTranslations()
  const listRef = useRef<HTMLDivElement>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const { chapters, currentChapter } = playerHandler.state
  const { seek } = playerHandler.controls

  // Reset search filter when modal is opened/closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
    }
  }, [isOpen])

  // Filter chapters based on active search query
  const filteredChapters = useMemo(() => {
    return filterChapters(chapters, searchQuery)
  }, [chapters, searchQuery])

  // Scroll to current chapter when modal opens
  useEffect(() => {
    if (isOpen && listRef.current && currentChapter && !searchQuery) {
      // Use requestAnimationFrame to ensure the modal is rendered
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
                {searchQuery ? `${filteredChapters.length} of ${chapters.length}` : chapters.length}
              </span>
            )}
          </div>
        </div>

        {/* Real-time Chapter Search Filter */}
        {chapters.length > 3 && (
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chapters by title or number..."
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-8 text-sm text-foreground outline-none transition-all placeholder:text-foreground-muted/50 focus:border-accent/50 focus:bg-white/10 focus:ring-1 focus:ring-accent/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-foreground-muted hover:bg-white/10 hover:text-foreground transition-colors"
                aria-label="Clear chapter search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        <div ref={listRef} className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
          {chapters.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-foreground-muted">
              <p>{t('MessageNoChapters')}</p>
            </div>
          ) : filteredChapters.length === 0 ? (
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
              {filteredChapters.map((chapter) => {
                const isCurrentChapter = chapter.id === currentChapterId
                const isListened = chapter.id < currentChapterId

                return (
                  <ChapterRow
                    key={chapter.id}
                    chapter={chapter}
                    isCurrentChapter={isCurrentChapter}
                    isListened={isListened}
                    onSeek={handleSeek}
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
