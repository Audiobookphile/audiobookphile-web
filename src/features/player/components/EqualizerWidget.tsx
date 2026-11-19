'use client'

import { arrow as arrowMw, autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react-dom'
import { Check, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { UsePlayerHandlerReturn } from '@/features/player/hooks/usePlayerHandler'
import {
  EQUALIZER_PRESETS,
  type EqualizerPreset,
  getPresetBands,
} from '@/features/player/lib/AudioEqualizer'
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

  const curveData = useMemo(() => {
    const bands = getPresetBands(currentPreset)
    const width = 248
    const height = 54
    const minLog = Math.log10(20)
    const maxLog = Math.log10(20000)
    const logRange = maxLog - minLog

    const points = bands.map((b) => {
      const clampedLog = Math.max(minLog, Math.min(maxLog, Math.log10(b.freq)))
      const x = ((clampedLog - minLog) / logRange) * width
      // Gain range: -10dB to +10dB, center at height / 2 = 27
      const y = Math.max(4, Math.min(height - 4, height / 2 - (b.gain / 10) * (height / 2 - 6)))
      return { x, y }
    })

    if (points.length === 0) return { pathD: '', areaD: '', points: [], width, height }

    let pathD = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[Math.min(points.length - 1, i + 2)]
      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6
      pathD += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
    }

    const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`
    return { pathD, areaD, points, width, height }
  }, [currentPreset])

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

      {/* Parametric EQ Frequency Response Curve */}
      <div className="relative mt-1 mb-1 overflow-hidden rounded-xl border border-white/10 bg-black/40 p-2">
        <div className="mb-1 flex items-center justify-between text-[10px] text-foreground-muted">
          <span>Frequency Response</span>
          <span className="font-mono text-[9px] text-primary/80">{activePresetInfo?.shortLabel || 'Flat'}</span>
        </div>
        <svg
          viewBox={`0 0 ${curveData.width} ${curveData.height}`}
          className="w-full h-14 overflow-visible"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="eq-curve-fill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--color-primary, #6366f1)" stopOpacity={isCustomActive ? '0.35' : '0.1'} />
              <stop offset="100%" stopColor="var(--color-primary, #6366f1)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* 0dB Reference Line */}
          <line
            x1="0"
            y1={curveData.height / 2}
            x2={curveData.width}
            y2={curveData.height / 2}
            stroke="currentColor"
            strokeDasharray="2 3"
            className="text-white/15"
            strokeWidth="1"
          />

          {/* Grid lines for 100Hz, 1kHz, 10kHz */}
          <line x1={curveData.width * 0.23} y1="0" x2={curveData.width * 0.23} y2={curveData.height} stroke="currentColor" strokeDasharray="1 4" className="text-white/10" strokeWidth="0.5" />
          <line x1={curveData.width * 0.57} y1="0" x2={curveData.width * 0.57} y2={curveData.height} stroke="currentColor" strokeDasharray="1 4" className="text-white/10" strokeWidth="0.5" />
          <line x1={curveData.width * 0.9} y1="0" x2={curveData.width * 0.9} y2={curveData.height} stroke="currentColor" strokeDasharray="1 4" className="text-white/10" strokeWidth="0.5" />

          {/* Area fill */}
          <path d={curveData.areaD} fill="url(#eq-curve-fill)" />

          {/* Response curve line */}
          <path
            d={curveData.pathD}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className={isCustomActive ? 'text-primary' : 'text-foreground-muted/60'}
          />

          {/* Filter nodal points */}
          {isCustomActive &&
            curveData.points.slice(1, -1).map((pt, idx) => (
              <circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r="2.5"
                className="fill-primary stroke-background"
                strokeWidth="1.5"
              />
            ))}
        </svg>

        {/* Axis markers */}
        <div className="mt-0.5 flex justify-between px-0.5 font-mono text-[8px] text-foreground-muted/60">
          <span>20Hz</span>
          <span>100Hz</span>
          <span>1kHz</span>
          <span>10kHz</span>
          <span>20kHz</span>
        </div>
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
