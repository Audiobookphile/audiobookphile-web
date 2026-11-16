'use client'

import { arrow as arrowMw, autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react-dom'
import { Check, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { UsePlayerHandlerReturn } from '@/features/player/hooks/usePlayerHandler'
import { EQUALIZER_PRESETS, type EqualizerPreset } from '@/features/player/lib/AudioEqualizer'
import { mergeClasses } from '@/shared/lib/merge-classes'

interface EqualizerWidgetProps {
  playerHandler: UsePlayerHandlerReturn
}

export default function EqualizerWidget({ playerHandler }: EqualizerWidgetProps) {
  const { settings } = playerHandler.state
  const { updateSettings } = playerHandler.controls
  const currentPreset = settings.equalizerPreset || 'off'

  const widgetId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const arrowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  useEffect(() => {
    if (popoverRef.current) {
      refs.setFloating(popoverRef.current)
    }
  }, [refs, isOpen])

  useEffect(() => {
    if (triggerRef.current) {
      refs.setReference(triggerRef.current)
    }
  }, [refs])

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

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  const toggleOpen = () => setIsOpen((prev) => !prev)

  const handleSelectPreset = (preset: EqualizerPreset) => {
    updateSettings({ equalizerPreset: preset })
    setIsOpen(false)
  }

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

  const activePresetInfo = EQUALIZER_PRESETS.find((p) => p.id === currentPreset)
  const isCustomActive = currentPreset !== 'off'

  const popoverContent = isOpen ? (
    <div
      ref={popoverRef}
      id={`${widgetId}-popover`}
      role="dialog"
      style={floatingStyles}
      className="z-70 flex w-72 flex-col gap-1.5 rounded-2xl border border-white/15 bg-background/95 p-3 shadow-2xl backdrop-blur-xl"
    >
      <div className="flex items-center justify-between px-1 pb-1 border-b border-white/10">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground opacity-80">
          <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
          Voice & Audio EQ
        </span>
        {isCustomActive && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
            <Sparkles className="h-2.5 w-2.5" />
            Active
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1 pt-1">
        {EQUALIZER_PRESETS.map((preset) => {
          const isSelected = preset.id === currentPreset
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset.id)}
              className={mergeClasses(
                'group flex items-start justify-between rounded-xl px-2.5 py-2 text-left transition-all active:scale-98',
                isSelected
                  ? 'border border-primary/40 bg-primary/15 text-primary shadow-sm'
                  : 'border border-transparent hover:border-white/10 hover:bg-white/5 text-foreground/80 hover:text-foreground'
              )}
            >
              <div className="flex flex-col pr-2">
                <span className="text-xs font-semibold leading-snug">
                  {preset.label}
                </span>
                <span className="text-[11px] leading-tight text-foreground-muted opacity-75">
                  {preset.description}
                </span>
              </div>
              {isSelected && (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              )}
            </button>
          )
        })}
      </div>

      <div
        ref={arrowRef}
        style={arrowStyles}
        className="absolute h-2 w-2 rotate-45 border-r border-b border-white/15 bg-background/95"
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
        aria-label="Voice EQ & Speech Clarity"
        title={`Voice EQ: ${activePresetInfo?.label || 'Flat'}`}
        className={mergeClasses(
          'flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-bold backdrop-blur-md transition-all active:scale-95',
          isCustomActive
            ? 'border-primary/40 bg-primary/20 text-primary shadow-md shadow-primary/20'
            : 'border-white/10 bg-white/5 text-foreground/70 hover:border-white/20 hover:bg-white/15 hover:text-foreground'
        )}
      >
        <SlidersHorizontal size={14} className={isCustomActive ? 'animate-pulse' : ''} />
        <span className="text-xs">{activePresetInfo?.shortLabel || 'EQ'}</span>
      </button>

      {mounted && typeof document !== 'undefined' && createPortal(popoverContent, document.body)}
    </>
  )
}
