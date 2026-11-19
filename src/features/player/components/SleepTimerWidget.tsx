'use client'

import { arrow as arrowMw, autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react-dom'
import { Bell, BellOff, Moon, Sparkles } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { UsePlayerHandlerReturn } from '@/features/player/hooks/usePlayerHandler'
import { usePlayerSettings } from '@/features/player/hooks/usePlayerSettings'
import { mergeClasses } from '@/shared/lib/merge-classes'

interface SleepTimerWidgetProps {
  playerHandler: UsePlayerHandlerReturn
}

const PRESET_DURATIONS = [5, 15, 30, 45, 60, 90] as const

export function formatSleepTimerRemaining(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function calculateSecondsUntilTargetTime(timeString: string, now: Date = new Date()): number | null {
  if (!timeString || !timeString.includes(':')) return null
  const [hoursStr, minutesStr] = timeString.split(':')
  const targetHour = parseInt(hoursStr, 10)
  const targetMinute = parseInt(minutesStr, 10)
  if (isNaN(targetHour) || isNaN(targetMinute)) return null

  const targetDate = new Date(now.getTime())
  targetDate.setHours(targetHour, targetMinute, 0, 0)

  // If the target time today has already passed, set for tomorrow
  if (targetDate.getTime() <= now.getTime()) {
    targetDate.setDate(targetDate.getDate() + 1)
  }

  const seconds = Math.round((targetDate.getTime() - now.getTime()) / 1000)
  return seconds > 0 ? seconds : null
}

export default function SleepTimerWidget({ playerHandler }: SleepTimerWidgetProps) {
  const { sleepTimerRemaining, currentChapter, currentTime, duration } = playerHandler.state
  const { startSleepTimer, extendSleepTimer, stopSleepTimer } = playerHandler.controls

  const { settings, updateSettings } = usePlayerSettings()
  const defaultDurationSeconds = settings.defaultSleepTimerDuration || 900

  const widgetId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [customMinutes, setCustomMinutes] = useState('')
  const [targetTimeInput, setTargetTimeInput] = useState('')

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

  const handleQuickStartDefault = () => {
    let secondsToStart = defaultDurationSeconds
    if (defaultDurationSeconds === -1) {
      secondsToStart = remainingInChapter > 0 ? remainingInChapter : 900
    }
    startSleepTimer(secondsToStart)
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

  const formatRemainingTime = formatSleepTimerRemaining

  const stopAtTime = useMemo(() => {
    if (sleepTimerRemaining === null) return null
    const d = new Date(Date.now() + sleepTimerRemaining * 1000)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }, [sleepTimerRemaining])

  const remainingInChapter = currentChapter ? Math.max(1, Math.round(currentChapter.end - currentTime)) : 0
  const remainingInTrack = duration > 0 ? Math.max(1, Math.round(duration - currentTime)) : 0

  const popoverContent = isOpen ? (
    <div
      ref={popoverRef}
      id={`${widgetId}-popover`}
      role="dialog"
      style={floatingStyles}
      className="z-70 flex w-64 flex-col gap-2 rounded-2xl border border-white/15 bg-background/95 p-3.5 shadow-2xl backdrop-blur-xl"
    >
      <div className="mb-1 text-center text-xs font-bold tracking-wider text-foreground uppercase opacity-70">
        Sleep Timer
      </div>

      {sleepTimerRemaining === null && (
        <button
          type="button"
          onClick={handleQuickStartDefault}
          className="mb-1 flex items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-primary/20 py-1.5 text-xs font-bold text-primary transition-all hover:bg-primary/30 active:scale-95 cursor-pointer shadow-sm shadow-primary/20"
        >
          <Sparkles size={13} />
          <span>Quick Start {defaultDurationSeconds === -1 ? 'End of Chapter' : `${Math.round(defaultDurationSeconds / 60)}m`}</span>
        </button>
      )}

      {sleepTimerRemaining !== null && (
        <div className="mb-1 flex flex-col gap-2 rounded-xl border border-primary/30 bg-primary/10 p-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <Moon size={13} />
              <span>Active Countdown</span>
              <button
                type="button"
                onClick={() => updateSettings({ sleepTimerChime: !settings.sleepTimerChime })}
                className="ml-1 flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-foreground/80 transition-colors hover:border-white/20 active:scale-95 cursor-pointer"
                title={settings.sleepTimerChime !== false ? 'Disable Expiry Chime' : 'Enable Expiry Chime'}
              >
                {settings.sleepTimerChime !== false ? (
                  <>
                    <Bell size={10} className="text-primary" />
                    <span>Chime</span>
                  </>
                ) : (
                  <>
                    <BellOff size={10} className="text-foreground/40" />
                    <span className="text-foreground/40">Mute</span>
                  </>
                )}
              </button>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-mono text-base font-extrabold text-primary tabular-nums">
                {formatRemainingTime(sleepTimerRemaining)}
              </span>
              {stopAtTime && (
                <span className="text-[10px] font-medium text-foreground/50">Stops at {stopAtTime}</span>
              )}
            </div>
          </div>

          {sleepTimerRemaining <= 15 && (
            <div className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/15 px-2 py-1 text-[11px] font-semibold text-amber-300 animate-pulse">
              <span>🔉 Fading volume smoothly...</span>
            </div>
          )}

          <div className="grid grid-cols-4 gap-1">
            <button
              type="button"
              onClick={() => {
                const newTime = Math.max(60, sleepTimerRemaining - 300)
                startSleepTimer(newTime)
              }}
              className="flex items-center justify-center rounded-lg border border-primary/25 bg-background/70 py-1 text-xs font-bold text-primary transition-all hover:bg-primary/20 active:scale-95 cursor-pointer"
              title="Subtract 5 minutes"
            >
              -5m
            </button>
            <button
              type="button"
              onClick={() => extendSleepTimer(300)}
              className="flex items-center justify-center rounded-lg border border-primary/25 bg-background/70 py-1 text-xs font-bold text-primary transition-all hover:bg-primary/20 active:scale-95 cursor-pointer"
              title="Add 5 minutes"
            >
              +5m
            </button>
            <button
              type="button"
              onClick={() => extendSleepTimer(900)}
              className="flex items-center justify-center rounded-lg border border-primary/25 bg-background/70 py-1 text-xs font-bold text-primary transition-all hover:bg-primary/20 active:scale-95 cursor-pointer"
              title="Add 15 minutes"
            >
              +15m
            </button>
            <button
              type="button"
              onClick={() => extendSleepTimer(1800)}
              className="flex items-center justify-center rounded-lg border border-primary/25 bg-background/70 py-1 text-xs font-bold text-primary transition-all hover:bg-primary/20 active:scale-95 cursor-pointer"
              title="Add 30 minutes"
            >
              +30m
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-6 gap-1">
        {PRESET_DURATIONS.map((minutes) => {
          const isDefault = minutes * 60 === defaultDurationSeconds
          return (
            <button
              key={minutes}
              type="button"
              onClick={() => handleStartTimer(minutes)}
              className={mergeClasses(
                'rounded-xl border px-1.5 py-1.5 text-center text-xs font-bold transition-all active:scale-95 cursor-pointer',
                isDefault
                  ? 'border-primary/50 bg-primary/20 text-primary hover:bg-primary hover:text-white'
                  : 'border-white/10 bg-white/5 text-foreground/80 hover:border-primary hover:bg-primary hover:text-white'
              )}
            >
              {minutes}m
            </button>
          )
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          const mins = parseInt(customMinutes, 10)
          if (!isNaN(mins) && mins > 0 && mins <= 360) {
            handleStartTimer(mins)
            setCustomMinutes('')
          }
        }}
        className="mt-0.5 flex items-center gap-1.5"
      >
        <input
          type="number"
          min="1"
          max="360"
          placeholder="Custom min (e.g. 20)"
          value={customMinutes}
          onChange={(e) => setCustomMinutes(e.target.value)}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={!customMinutes || isNaN(parseInt(customMinutes, 10)) || parseInt(customMinutes, 10) <= 0}
          className="cursor-pointer rounded-xl border border-primary/30 bg-primary/20 px-3 py-1 text-xs font-bold text-primary transition-all hover:bg-primary/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Set
        </button>
      </form>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          const seconds = calculateSecondsUntilTargetTime(targetTimeInput)
          if (seconds) {
            startSleepTimer(seconds)
            setTargetTimeInput('')
            setIsOpen(false)
          }
        }}
        className="mt-0.5 flex items-center gap-1.5"
      >
        <input
          type="time"
          aria-label="Stop at specific time"
          value={targetTimeInput}
          onChange={(e) => setTargetTimeInput(e.target.value)}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={!targetTimeInput}
          className="cursor-pointer rounded-xl border border-primary/30 bg-primary/20 px-3 py-1 text-xs font-bold text-primary transition-all hover:bg-primary/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          At Time
        </button>
      </form>
      {currentChapter && remainingInChapter > 0 && (
        <button
          type="button"
          onClick={() => {
            startSleepTimer(remainingInChapter)
            setIsOpen(false)
          }}
          className="mt-0.5 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/20 active:scale-95 cursor-pointer"
        >
          <span>End of Chapter</span>
          <span className="font-mono text-xs opacity-75">{formatRemainingTime(remainingInChapter)}</span>
        </button>
      )}
      {remainingInTrack > 0 && (!currentChapter || Math.abs(remainingInTrack - remainingInChapter) > 5) && (
        <button
          type="button"
          onClick={() => {
            startSleepTimer(remainingInTrack)
            setIsOpen(false)
          }}
          className="mt-0.5 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/20 active:scale-95 cursor-pointer"
        >
          <span>End of Track</span>
          <span className="font-mono text-xs opacity-75">{formatRemainingTime(remainingInTrack)}</span>
        </button>
      )}
      {sleepTimerRemaining !== null && (
        <button
          type="button"
          onClick={handleStopTimer}
          className="mt-1 w-full rounded-xl border border-error/30 bg-error/15 py-1.5 text-xs font-bold text-error transition-all hover:bg-error/25 active:scale-95"
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
        onContextMenu={(e) => {
          if (sleepTimerRemaining !== null) {
            e.preventDefault()
            extendSleepTimer(300)
          }
        }}
        aria-expanded={isOpen}
        aria-controls={`${widgetId}-popover`}
        aria-label="Sleep Timer"
        title={
          sleepTimerRemaining !== null
            ? `Sleep Timer: ${formatRemainingTime(sleepTimerRemaining)} remaining (Right-click to +5m)`
            : 'Sleep Timer'
        }
        className={mergeClasses(
          'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold backdrop-blur-md transition-all active:scale-95 cursor-pointer',
          sleepTimerRemaining !== null
            ? 'bg-primary/20 text-primary border-primary/40 shadow-primary/20 shadow-md ring-1 ring-primary/30'
            : 'text-foreground/70 hover:text-foreground border-white/10 bg-white/5 hover:bg-white/15'
        )}
      >
        {sleepTimerRemaining !== null ? (
          <span className="relative flex h-2.5 w-2.5 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
          </span>
        ) : (
          <Moon size={15} />
        )}
        {sleepTimerRemaining !== null && (
          <span className="tabular-nums font-mono">{formatRemainingTime(sleepTimerRemaining)}</span>
        )}
      </button>

      {mounted && typeof document !== 'undefined' && createPortal(popoverContent, document.body)}
    </>
  )
}
