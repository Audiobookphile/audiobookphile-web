'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PlayerTrackGpuOverlay from '@/features/player/components/PlayerTrackGpuOverlay'
import type { UsePlayerHandlerReturn } from '@/features/player/hooks/usePlayerHandler'
import { publishTrackGpuState } from '@/features/player/lib/playerTrackGpu'
import { secondsToTimestamp } from '@/shared/lib/datefns'
import { mergeClasses } from '@/shared/lib/merge-classes'
import { PlayerState } from '@/types/api'

interface PlayerTrackBarProps {
  playerHandler: UsePlayerHandlerReturn
}

interface ChapterTick {
  title: string
  left: number
}

export function formatEstimatedFinishTime(remainingSeconds: number, now: Date = new Date()): string {
  if (!isFinite(remainingSeconds) || remainingSeconds <= 0) return 'Ends now'
  const finishDate = new Date(now.getTime() + remainingSeconds * 1000)
  const hours = finishDate.getHours()
  const minutes = finishDate.getMinutes().toString().padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  const timeStr = `${displayHours}:${minutes} ${ampm}`

  const isTomorrow =
    finishDate.getDate() !== now.getDate() ||
    finishDate.getMonth() !== now.getMonth() ||
    finishDate.getFullYear() !== now.getFullYear()

  return isTomorrow ? `Ends tom. ${timeStr}` : `Ends ${timeStr}`
}

export default function PlayerTrackBar({ playerHandler }: PlayerTrackBarProps) {
  const { currentTime, duration, bufferedTime, settings, chapters, playerState, currentChapter } = playerHandler.state
  const { seek } = playerHandler.controls
  const { playbackRate, useChapterTrack } = settings

  const isLoading = playerState === PlayerState.LOADING

  // Refs for DOM elements
  const trackRef = useRef<HTMLDivElement>(null)
  const hoverTimestampRef = useRef<HTMLDivElement>(null)
  const hoverTimestampTextRef = useRef<HTMLParagraphElement>(null)
  const hoverTimestampArrowRef = useRef<HTMLDivElement>(null)
  const trackCursorRef = useRef<HTMLDivElement>(null)

  // State
  const [trackWidth, setTrackWidth] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  // isDragging: pointer-down → pointer-up so the thumb follows cursor/touch
  const [isDragging, setIsDragging] = useState(false)
  // While dragging show the drag position instead of real currentTime
  const [dragPercent, setDragPercent] = useState<number | null>(null)
  // Remaining display modes: 'total' | 'chapter' | 'finish'
  type RemainingTimeMode = 'total' | 'chapter' | 'finish'
  const [remainingMode, setRemainingMode] = useState<RemainingTimeMode>('total')

  // Chapter duration and start for chapter-mode display
  const currentChapterDuration = currentChapter ? currentChapter.end - currentChapter.start : 0
  const currentChapterStart = currentChapter ? currentChapter.start : 0

  const effectivePlaybackRate = playbackRate && !isNaN(playbackRate) ? playbackRate : 1

  const remainingTotal = (duration - currentTime) / effectivePlaybackRate
  const remainingChapter = currentChapter && currentChapterDuration > 0
    ? (currentChapter.end - currentTime) / effectivePlaybackRate
    : remainingTotal

  const isShowingChapter = (useChapterTrack || remainingMode === 'chapter') && currentChapter != null

  let timeRemainingFormatted = ''
  let remainingTooltip = ''
  if (remainingMode === 'finish') {
    timeRemainingFormatted = formatEstimatedFinishTime(remainingTotal)
    remainingTooltip = 'Showing estimated completion time at current speed. Click to show Total remaining.'
  } else if (isShowingChapter) {
    timeRemainingFormatted =
      remainingChapter < 0
        ? `${secondsToTimestamp(remainingChapter * -1)} (ch)`
        : `-${secondsToTimestamp(remainingChapter)} (ch)`
    remainingTooltip = 'Showing Chapter remaining time. Click to show estimated completion clock time.'
  } else {
    timeRemainingFormatted =
      remainingTotal < 0
        ? `${secondsToTimestamp(remainingTotal * -1)}`
        : `-${secondsToTimestamp(remainingTotal)}`
    remainingTooltip = currentChapter
      ? 'Showing Total remaining time. Click to show Chapter remaining.'
      : 'Showing Total remaining time. Click to show estimated completion clock time.'
  }

  const currentTimeToShow = useChapterTrack ? Math.max(0, currentTime - currentChapterStart) : currentTime
  const currentTimeFormatted = secondsToTimestamp(currentTimeToShow / effectivePlaybackRate)
  const currentChapterNumber = currentChapter ? chapters.findIndex((ch) => ch.id === currentChapter.id) + 1 : null

  const effectiveDuration = useChapterTrack ? currentChapterDuration : duration
  const playedTime = useChapterTrack ? Math.max(0, currentTime - currentChapterStart) : currentTime
  const rawPlayedPercent = effectiveDuration ? Math.min(100, (playedTime / effectiveDuration) * 100) : 0
  // While dragging, show the drag position on the bar instead of real progress
  const playedPercent = isDragging && dragPercent !== null ? dragPercent : rawPlayedPercent

  const bufferedTimeAdjusted = useChapterTrack ? Math.max(0, bufferedTime - currentChapterStart) : bufferedTime
  const bufferedPercent = effectiveDuration ? Math.min(100, (bufferedTimeAdjusted / effectiveDuration) * 100) : 0

  const chapterTicks = useMemo<ChapterTick[]>(() => {
    if (!duration || trackWidth === 0) return []
    return chapters.map((chapter) => ({
      title: chapter.title,
      left: (chapter.start / duration) * trackWidth,
    }))
  }, [chapters, duration, trackWidth])

  // Measure track width — uses ResizeObserver so it stays accurate after animations
  const measureTrack = useCallback(() => {
    if (trackRef.current) {
      const rect = trackRef.current.getBoundingClientRect()
      if (rect.width > 0) setTrackWidth(rect.width)
    }
  }, [])

  useEffect(() => {
    measureTrack()
    const timer = setTimeout(measureTrack, 150) // catch CSS-transition-in
    const ro = new ResizeObserver(measureTrack)
    if (trackRef.current) ro.observe(trackRef.current)
    window.addEventListener('resize', measureTrack)
    return () => {
      clearTimeout(timer)
      ro.disconnect()
      window.removeEventListener('resize', measureTrack)
    }
  }, [measureTrack])

  useEffect(() => {
    measureTrack()
  }, [playerState, measureTrack])

  // ─── Shared helpers ──────────────────────────────────────────────────────────

  /** Converts a clientX pixel position to a {time, perc} pair. */
  const getSeekFromClientX = useCallback(
    (clientX: number): { time: number; perc: number } | null => {
      const rect = trackRef.current?.getBoundingClientRect()
      if (!rect || !rect.width) return null
      const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width))
      const perc = Math.max(0, Math.min(offsetX / rect.width, 1))
      const dur = useChapterTrack ? currentChapterDuration : duration
      if (!dur || dur <= 0 || isNaN(dur)) return null
      const baseTime = useChapterTrack ? currentChapterStart : 0
      const time = Math.max(baseTime, Math.min(baseTime + perc * dur, baseTime + dur))
      if (isNaN(time)) return null
      return { time, perc: perc * 100 }
    },
    [useChapterTrack, currentChapterStart, currentChapterDuration, duration]
  )

  /** Updates tooltip text and position for a given clientX. */
  const updateHoverUI = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect()
      if (!rect || !rect.width) return
      const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width))
      const dur = useChapterTrack ? currentChapterDuration : duration
      if (!dur || dur <= 0) return
      const progressTime = (offsetX / rect.width) * dur
      const totalTime = (useChapterTrack ? currentChapterStart : 0) + progressTime

      if (hoverTimestampRef.current) {
        const w = hoverTimestampRef.current.clientWidth
        let posLeft = offsetX - w / 2
        if (posLeft + w + rect.left > window.innerWidth) posLeft = window.innerWidth - w - rect.left
        else if (posLeft < -rect.left) posLeft = -rect.left
        hoverTimestampRef.current.style.left = `${posLeft}px`
      }
      if (hoverTimestampArrowRef.current) {
        const aw = hoverTimestampArrowRef.current.clientWidth
        hoverTimestampArrowRef.current.style.left = `${offsetX - aw / 2}px`
      }
      if (hoverTimestampTextRef.current) {
        let text = secondsToTimestamp(progressTime / effectivePlaybackRate)
        const chapter = chapters.find((ch) => ch.start <= totalTime && totalTime < ch.end)
        if (chapter?.title) text += ` - ${chapter.title}`
        hoverTimestampTextRef.current.innerText = text
      }
      if (trackCursorRef.current) {
        trackCursorRef.current.style.left = `${offsetX - 1}px`
      }
      // Same position, in the form the GPU layer's shader wants (0..1).
      publishTrackGpuState({ hoverPercent: rect.width ? offsetX / rect.width : 0 })
    },
    [useChapterTrack, currentChapterStart, currentChapterDuration, duration, effectivePlaybackRate, chapters]
  )

  const activePointerIdRef = useRef<number | null>(null)

  // Mirror the render-derived values into the GPU layer's store after commit.
  // The overlay samples that store once per animation frame, so this bar is
  // never re-rendered for pointer-level updates.
  useEffect(() => {
    publishTrackGpuState({
      playedPercent,
      bufferedPercent,
      isHovering,
      isDragging,
      isLoading,
    })
  }, [playedPercent, bufferedPercent, isHovering, isDragging, isLoading])

  // ─── Pointer events (Unified Mouse & Touch) ──────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Ignore if loading or if it's a right-click (button 2)
      if (isLoading || e.button !== 0) return

      e.preventDefault() // prevent text selection
      activePointerIdRef.current = e.pointerId
      setIsDragging(true)
      setIsHovering(true)
      const r = getSeekFromClientX(e.clientX)
      if (r) setDragPercent(r.perc)
    },
    [isLoading, getSeekFromClientX]
  )

  const handlePointerEnter = useCallback(() => {
    if (!isDragging) setIsHovering(true)
  }, [isDragging])

  const handlePointerLeave = useCallback(() => {
    if (!isDragging) {
      setIsHovering(false)
      publishTrackGpuState({ hoverPercent: null })
    }
  }, [isDragging])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      updateHoverUI(e.clientX)
    },
    [updateHoverUI]
  )

  // Global pointermove + pointerup so dragging works even outside the element
  useEffect(() => {
    if (!isDragging) return

    const onMove = (e: PointerEvent) => {
      if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return
      updateHoverUI(e.clientX)
      const r = getSeekFromClientX(e.clientX)
      if (r) setDragPercent(r.perc)
    }

    const onUp = (e: PointerEvent) => {
      if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return
      activePointerIdRef.current = null
      const r = getSeekFromClientX(e.clientX)
      if (r && !isNaN(r.time)) {
        seek(r.time)
      }
      setIsDragging(false)
      setIsHovering(false)
      setDragPercent(null)
    }

    const onCancel = (e: PointerEvent) => {
      if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return
      activePointerIdRef.current = null
      setIsDragging(false)
      setIsHovering(false)
      setDragPercent(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
    }
  }, [isDragging, getSeekFromClientX, updateHoverUI, seek])

  return (
    <div>
      <div className="relative">
        {/* Track */}
        <div
          ref={trackRef}
          role="slider"
          aria-label="Playback position"
          aria-valuemin={0}
          aria-valuemax={Math.round(effectiveDuration)}
          aria-valuenow={Math.round(playedTime)}
          aria-valuetext={currentTimeFormatted}
          tabIndex={0}
          className={mergeClasses(
            'bg-track-bg relative h-2 w-full touch-none rounded-full ring-1 ring-white/5 transition-transform duration-100',
            isDragging ? 'scale-y-150 cursor-grabbing' : 'cursor-pointer hover:scale-y-125'
          )}
          onPointerDown={handlePointerDown}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onPointerMove={handlePointerMove}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 30 : 5
            if (e.key === 'ArrowLeft') seek(Math.max(0, currentTime - step))
            else if (e.key === 'ArrowRight') seek(Math.min(duration, currentTime + step))
          }}
        >
          {/* Buffer */}
          <div
            className="pointer-events-none absolute top-0 left-0 h-full bg-track-progress/50 transition-[width] duration-75"
            style={{ width: `${bufferedPercent}%` }}
          />
          {/* Played */}
          <div
            className="pointer-events-none absolute top-0 left-0 h-full bg-track-progress shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-[width] duration-75"
            style={{ width: `${playedPercent}%` }}
          />
          {/* Playhead thumb */}
          <div
            className={mergeClasses(
              'pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg transition-opacity duration-100',
              isHovering || isDragging ? 'opacity-100' : 'opacity-0'
            )}
            style={{ left: `${playedPercent}%` }}
          />
          {/* Cursor line */}
          <div
            ref={trackCursorRef}
            className={mergeClasses(
              'pointer-events-none absolute top-0 left-0 h-full w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-opacity duration-100',
              isHovering && !isDragging ? 'opacity-100' : 'opacity-0'
            )}
          />
          {/* Embedded Chapter Notch Dividers on the slider track */}
          {!useChapterTrack && duration > 0 && chapters.length > 1 && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
              {chapters.slice(1).map((ch, idx) => {
                const perc = (ch.start / duration) * 100
                if (perc <= 0 || perc >= 100) return null
                return (
                  <div
                    key={ch.id ?? idx}
                    className="absolute top-0 bottom-0 w-[1.5px] bg-white/25 shadow-[0_0_2px_rgba(0,0,0,0.4)] z-[2]"
                    style={{ left: `${perc}%` }}
                    title={ch.title}
                  />
                )
              })}
            </div>
          )}

          {/* Loading shimmer */}
          {isLoading && (
            <div className="loading-track-slide pointer-events-none absolute top-0 h-full w-1/4 bg-gradient-to-r from-transparent via-track-progress/30 to-transparent" />
          )}
          {/*
            GPU track layer. Painted on top of the DOM fills above and rendered
            only when WebGPU is available; `pointer-events-none` keeps hit
            testing on the role="slider" element, and it is `aria-hidden`, so the
            accessibility tree is byte-for-byte what it was before. When WebGPU
            is missing the canvas is never even imported and the DOM fills above
            are the whole visual.
          */}
          <PlayerTrackGpuOverlay trackRef={trackRef} />
        </div>

        {/* Chapter ticks */}
        <div className={mergeClasses('relative h-2 w-full overflow-hidden', useChapterTrack ? 'opacity-0' : '')}>
          {chapterTicks.map((tick, index) => (
            <div
              key={index}
              className="pointer-events-none absolute top-0 h-1 w-px bg-track-progress/30"
              style={{ left: `${tick.left}px` }}
            />
          ))}
        </div>

        {/* Hover timestamp tooltip */}
        <div
          ref={hoverTimestampRef}
          className={mergeClasses(
            'bg-foreground text-background pointer-events-none absolute -top-8 left-0 z-10 rounded-full transition-opacity duration-100',
            isHovering || isDragging ? 'opacity-100' : 'opacity-0'
          )}
        >
          <p
            ref={hoverTimestampTextRef}
            className="truncate px-2 py-0.5 text-center font-mono text-xs whitespace-nowrap"
          >
            00:00
          </p>
        </div>

        {/* Hover timestamp arrow */}
        <div
          ref={hoverTimestampArrowRef}
          className={mergeClasses(
            'bg-foreground text-background pointer-events-none absolute -top-3.5 left-0 rounded-full transition-opacity duration-100',
            isHovering || isDragging ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div className="absolute right-0 -bottom-1.5 left-0 flex w-full justify-center">
            <div className="h-0 w-0 border-t-4 border-r-4 border-l-4 border-t-foreground border-r-transparent border-l-transparent" />
          </div>
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-foreground-muted">
        <p className="shrink-0 font-mono">
          {currentTimeFormatted}
          <span className="opacity-60 pl-1">({Math.round(playedPercent)}%)</span>
        </p>
        {currentChapter && (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('audiobookphile:toggle-chapters'))}
            className="group flex min-w-0 max-w-[260px] cursor-pointer items-center justify-center gap-1 truncate text-center text-xs opacity-80 transition-all hover:opacity-100 hover:text-accent"
            title={`${currentChapter.title} - Click to view chapters (C)`}
          >
            <span className="truncate">{currentChapter.title}</span>
            {useChapterTrack && (
              <span className="shrink-0 text-[11px] text-foreground-subdued group-hover:text-accent/80">
                ({currentChapterNumber} of {chapters.length})
              </span>
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setRemainingMode((prev) => {
              if (prev === 'total') return currentChapter ? 'chapter' : 'finish'
              if (prev === 'chapter') return 'finish'
              return 'total'
            })
          }}
          className="shrink-0 font-mono transition-colors text-xs select-none cursor-pointer hover:text-accent focus:outline-none"
          title={remainingTooltip}
          aria-label="Toggle remaining time display"
        >
          {timeRemainingFormatted}
        </button>
      </div>
    </div>
  )
}
