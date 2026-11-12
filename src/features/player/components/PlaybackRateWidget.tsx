'use client'

import { arrow as arrowMw, autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react-dom'
import { Minus, Plus } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { UsePlayerHandlerReturn } from '@/features/player/hooks/usePlayerHandler'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { mergeClasses } from '@/shared/lib/merge-classes'
import IconBtn from '../../../shared/ui/IconBtn'

interface PlaybackRateWidgetProps {
  playerHandler: UsePlayerHandlerReturn
}

const PRESET_RATES = [0.5, 1, 1.2, 1.5, 2] as const

export default function PlaybackRateWidget({ playerHandler }: PlaybackRateWidgetProps) {
  const t = useTypeSafeTranslations()
  const { playbackRate, playbackRateIncrementDecrement } = playerHandler.state.settings
  const { setPlaybackRate, incrementPlaybackRate, decrementPlaybackRate } = playerHandler.controls

  const widgetId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const arrowRef = useRef<HTMLDivElement>(null)

  // Format the playback rate based on increment setting
  const formatRate = useCallback(
    (rate: number): string => {
      if (playbackRateIncrementDecrement === 0.05) {
        return rate.toFixed(2)
      }
      return rate.toFixed(1)
    },
    [playbackRateIncrementDecrement]
  )

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
      // Don't close if clicking inside the popover or on the trigger
      if (popoverRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return
      }
      setIsOpen(false)
    }

    // Use mousedown instead of click for more immediate response
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

  const toggleOpen = () => {
    setIsOpen((prev) => !prev)
  }

  const handlePresetClick = (rate: number) => {
    setPlaybackRate(rate)
  }

  const handleIncrement = () => {
    incrementPlaybackRate()
  }

  const handleDecrement = () => {
    decrementPlaybackRate()
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

  const popoverContent = isOpen ? (
    <div
      ref={popoverRef}
      id={`${widgetId}-popover`}
      role="dialog"
      style={floatingStyles}
      className="z-70 rounded-2xl border border-white/15 bg-background/90 p-3 shadow-2xl backdrop-blur-xl"
    >
      {/* Preset buttons row */}
      <div className="mb-3 flex gap-1">
        {PRESET_RATES.map((rate) => (
          <button
            key={rate}
            type="button"
            onClick={() => handlePresetClick(rate)}
            className={mergeClasses(
              'rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all',
              playbackRate === rate
                ? 'bg-primary border-primary shadow-primary/30 text-white shadow-md'
                : 'text-foreground/70 hover:text-foreground border-white/10 bg-white/5 hover:bg-white/15'
            )}
          >
            {rate}x
          </button>
        ))}
      </div>

      {/* Increment/decrement row */}
      <div className="flex items-center gap-2">
        {/* Minus button */}
        <IconBtn onClick={handleDecrement} icon={Minus} size="small" ariaLabel="Decrease playback rate" />

        {/* Current rate display */}
        <div className="flex min-w-[100px] flex-1 items-center justify-center text-2xl font-bold text-foreground tabular-nums">
          {formatRate(playbackRate)}x
        </div>

        {/* Plus button */}
        <IconBtn onClick={handleIncrement} icon={Plus} size="small" ariaLabel="Increase playback rate" />
      </div>

      {/* Arrow */}
      <div
        ref={arrowRef}
        style={arrowStyles}
        className="absolute h-2 w-2 rotate-45 border-r border-b border-white/15 bg-background/90"
      />
    </div>
  ) : null

  return (
    <>
      {/* toggle widget button showing current playback rate */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        aria-expanded={isOpen}
        aria-controls={`${widgetId}-popover`}
        aria-label={`${t('LabelPlaybackRate')}: ${formatRate(playbackRate)}x`}
        className="flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-foreground/80 tabular-nums backdrop-blur-md transition-all hover:bg-white/15 hover:text-foreground active:scale-95"
      >
        {formatRate(playbackRate)}x
      </button>

      {/* Popover rendered via portal */}
      {mounted && typeof document !== 'undefined' && createPortal(popoverContent, document.body)}
    </>
  )
}
