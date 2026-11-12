'use client'

import { arrow as arrowMw, autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react-dom'
import { Moon } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { UsePlayerHandlerReturn } from '@/features/player/hooks/usePlayerHandler'
import { mergeClasses } from '@/shared/lib/merge-classes'

interface SleepTimerWidgetProps {
  playerHandler: UsePlayerHandlerReturn
}

const PRESET_DURATIONS = [5, 15, 30, 45, 60] as const

export default function SleepTimerWidget({ playerHandler }: SleepTimerWidgetProps) {
  const { sleepTimerRemaining } = playerHandler.state
  const { startSleepTimer, stopSleepTimer } = playerHandler.controls

  const widgetId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const arrowRef = useRef<HTMLDivElement>(null)

  // Ensure component is mounted before rendering popover
  useEffect(() => {
    setMounted(true)
  }, [])

  // Floating UI positioning
  const middleware = useMemo(
    () => [
      offset(8),
      shift({ padding: 8 }),
      flip({ fallbackAxisSideDirection: 'start' }),
      arrowMw({ element: arrowRef }),
    ],
    []
  )

  const {
    refs,
    floatingStyles,
    placement: resolvedPlacement,
    middlewareData,
  } = useFloating({
    open: isOpen,
    placement: 'top',
    strategy: 'fixed',
    middleware,
    whileElementsMounted: autoUpdate,
    elements: {
      reference: triggerRef.current,
    },
  })

  // Sync popover ref with Floating UI
  useEffect(() => {
    if (popoverRef.current) {
      refs.setFloating(popoverRef.current)
    }
  }, [refs, isOpen])

  // Update reference element when trigger ref is available
  useEffect(() => {
    if (triggerRef.current) {
      refs.setReference(triggerRef.current)
    }
  }, [refs])

  // Close on mousedown outside
  useEffect(() => {
    if (!isOpen) return

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (popoverRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return
      }
      setIsOpen(false)
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  const toggleOpen = () => setIsOpen((prev) => !prev)

  const handleStartTimer = (minutes: number) => {
    startSleepTimer(minutes * 60)
    setIsOpen(false)
  }

  const handleStopTimer = () => {
    stopSleepTimer()
    setIsOpen(false)
  }

  // Arrow positioning
  const arrowStyles = useMemo<React.CSSProperties>(() => {
    const { x, y } = middlewareData.arrow ?? {}
    const staticSide: Record<string, keyof React.CSSProperties> = {
      top: 'bottom',
      bottom: 'top',
      left: 'right',
      right: 'left',
    }
    return {
      left: x != null ? `${x}px` : '',
      top: y != null ? `${y}px` : '',
      [staticSide[resolvedPlacement.split('-')[0]]]: '-4px',
    }
  }, [middlewareData.arrow, resolvedPlacement])

  const formatRemainingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const popoverContent = isOpen ? (
    <div
      ref={popoverRef}
      id={`${widgetId}-popover`}
      role="dialog"
      style={floatingStyles}
      className="z-70 flex flex-col gap-2 rounded-2xl border border-white/15 bg-background/90 p-3.5 shadow-2xl backdrop-blur-xl"
    >
      <div className="mb-1 text-center text-xs font-bold tracking-wider text-foreground uppercase opacity-70">
        Sleep Timer
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {PRESET_DURATIONS.map((minutes) => (
          <button
            key={minutes}
            type="button"
            onClick={() => handleStartTimer(minutes)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-foreground/80 transition-all hover:border-primary hover:bg-primary hover:text-white hover:shadow-md hover:shadow-primary/30 active:scale-95"
          >
            {minutes}m
          </button>
        ))}
      </div>
      {sleepTimerRemaining !== null && (
        <button
          type="button"
          onClick={handleStopTimer}
          className="mt-2 w-full rounded-xl border border-error/30 bg-error/15 py-1.5 text-xs font-bold text-error transition-all hover:bg-error/25 active:scale-95"
        >
          Cancel Timer
        </button>
      )}
      <div
        ref={arrowRef}
        style={arrowStyles}
        className="absolute h-2 w-2 rotate-45 border-r border-b border-white/15 bg-background/90"
      />
    </div>
  ) : null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        aria-expanded={isOpen}
        aria-controls={`${widgetId}-popover`}
        aria-label="Sleep Timer"
        className={mergeClasses(
          'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold backdrop-blur-md transition-all active:scale-95',
          sleepTimerRemaining !== null
            ? 'bg-primary/20 text-primary border-primary/40 shadow-primary/20 shadow-md'
            : 'text-foreground/70 hover:text-foreground border-white/10 bg-white/5 hover:bg-white/15'
        )}
      >
        <Moon size={15} />
        {sleepTimerRemaining !== null && (
          <span className="tabular-nums">{formatRemainingTime(sleepTimerRemaining)}</span>
        )}
      </button>

      {mounted && typeof document !== 'undefined' && createPortal(popoverContent, document.body)}
    </>
  )
}
