'use client'

import { autoUpdate, flip, offset, useFloating } from '@floating-ui/react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Volume1, Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { UsePlayerHandlerReturn } from '@/features/player/hooks/usePlayerHandler'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'

interface VolumeControlProps {
  playerHandler: UsePlayerHandlerReturn
}

export default function VolumeControl({ playerHandler }: VolumeControlProps) {
  const t = useTypeSafeTranslations()
  const { volume } = playerHandler.state
  const { setVolume, toggleMute } = playerHandler.controls

  const widgetId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isPositioned, setIsPositioned] = useState(false)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const hideTimeoutRef = useRef<number | null>(null)

  // Get the appropriate volume icon based on current level
  const VolumeIcon = useMemo(() => {
    if (volume === 0) return VolumeX
    if (volume < 0.5) return Volume1
    return Volume2
  }, [volume])

  // Ensure component is mounted before rendering popover
  useEffect(() => {
    setMounted(true)
  }, [])

  // Floating UI positioning
  const middleware = useMemo(() => [offset(8), flip({ fallbackAxisSideDirection: 'none' })], [])

  const { refs, floatingStyles, update } = useFloating({
    open: isOpen,
    placement: 'top',
    strategy: 'fixed',
    middleware,
    whileElementsMounted: autoUpdate,
  })

  // Sync refs with Floating UI
  useEffect(() => {
    if (triggerRef.current) {
      refs.setReference(triggerRef.current)
    }
  }, [refs])

  useEffect(() => {
    if (popoverRef.current && isOpen) {
      refs.setFloating(popoverRef.current)
      // Force an update and mark as positioned after next frame
      update()
      requestAnimationFrame(() => {
        setIsPositioned(true)
      })
    }
  }, [refs, isOpen, update])

  // Reset positioned state when closing
  useEffect(() => {
    if (!isOpen) {
      setIsPositioned(false)
    }
  }, [isOpen])

  // Clear any pending hide timeout
  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current !== null) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => clearHideTimeout()
  }, [clearHideTimeout])

  // Handle hover open/close with delay
  const openPopover = useCallback(() => {
    clearHideTimeout()
    setIsOpen(true)
  }, [clearHideTimeout])

  const closePopoverSoon = useCallback(() => {
    clearHideTimeout()
    hideTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false)
    }, 100)
  }, [clearHideTimeout])

  const trackRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)

  // Calculate volume from mouse/touch position
  const calculateVolumeFromEvent = useCallback(
    (clientY: number) => {
      if (!trackRef.current) return
      const rect = trackRef.current.getBoundingClientRect()
      // Calculate position from bottom (0 = bottom, 1 = top)
      const relativeY = rect.bottom - clientY
      const newVolume = Math.max(0, Math.min(1, relativeY / rect.height))
      setVolume(newVolume)
    },
    [setVolume]
  )

  // Handle mouse/touch interactions
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isDraggingRef.current = true
      calculateVolumeFromEvent(e.clientY)

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (isDraggingRef.current) {
          calculateVolumeFromEvent(moveEvent.clientY)
        }
      }

      const handleMouseUp = () => {
        isDraggingRef.current = false
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [calculateVolumeFromEvent]
  )

  const volumePercentage = Math.round(volume * 100)
  const trackHeight = 128
  const filledHeight = trackHeight * volume

  const popoverContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popoverRef}
          id={`${widgetId}-popover`}
          role="dialog"
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{
            ...floatingStyles,
            visibility: isPositioned ? 'visible' : 'hidden',
          }}
          className="z-[100] flex flex-col items-center"
          onMouseEnter={openPopover}
          onMouseLeave={closePopoverSoon}
        >
          <div
            className="flex flex-col items-center rounded-2xl border border-white/10 bg-primary/95 p-4 shadow-2xl backdrop-blur-xl"
            style={{ marginBottom: -8 }}
          >
            <div
              ref={trackRef}
              role="slider"
              tabIndex={0}
              aria-label={t('LabelVolume')}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={volumePercentage}
              aria-valuetext={`${volumePercentage}%`}
              className="group relative flex cursor-pointer items-center justify-center select-none"
              style={{ height: trackHeight, width: 24 }}
              onMouseDown={handleMouseDown}
            >
              <div
                className="pointer-events-none absolute rounded-full bg-white/10 transition-colors group-hover:bg-white/20"
                style={{ width: 6, height: trackHeight }}
              />
              <div
                className="pointer-events-none absolute rounded-full bg-accent shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                style={{ width: 6, height: filledHeight, bottom: 0 }}
              />
              <motion.div
                className="pointer-events-none absolute rounded-full bg-white shadow-lg"
                animate={{ scale: isDraggingRef.current ? 1.2 : 1 }}
                style={{
                  width: 14,
                  height: 14,
                  bottom: filledHeight - 7,
                  border: '2px solid rgb(245, 158, 11)',
                }}
              />
            </div>
            <span className="mt-2 font-mono text-[10px] font-black text-white/40">{volumePercentage}%</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      {/* Volume icon button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleMute}
        onMouseEnter={openPopover}
        onMouseLeave={closePopoverSoon}
        aria-label={t('LabelVolume')}
        aria-expanded={isOpen}
        aria-controls={`${widgetId}-popover`}
        className="flex h-10 w-10 cursor-pointer items-center justify-center text-foreground/60 transition-all duration-300 hover:scale-110 hover:text-white active:scale-95"
      >
        <VolumeIcon size={24} strokeWidth={2} />
      </button>

      {/* Popover rendered via portal */}
      {mounted && typeof document !== 'undefined' && createPortal(popoverContent, document.body)}
    </>
  )
}
