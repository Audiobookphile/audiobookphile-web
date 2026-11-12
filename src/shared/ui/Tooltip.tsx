'use client'
import {
  arrow as arrowMw,
  autoUpdate,
  flip,
  offset,
  type Placement,
  shift,
  size,
  useFloating,
} from '@floating-ui/react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useModalRef } from '@/shared/contexts/ModalContext'
import { mergeClasses } from '@/shared/lib/merge-classes'

interface TooltipProps {
  text: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  usePortal?: boolean
  className?: string
  offsetPx?: number
  edgePadding?: number
  maxWidth?: number
  withArrow?: boolean
  closeOnClick?: boolean
  tooltipClassName?: string
  disabled?: boolean
  addTabIndex?: boolean
  openOnClick?: boolean
}

const placementMap: Record<NonNullable<TooltipProps['position']>, Placement> = {
  top: 'top',
  bottom: 'bottom',
  left: 'left',
  right: 'right',
}

const Tooltip = ({
  text,
  children,
  position = 'right',
  usePortal: usePortalProp = false,
  className,
  offsetPx = 10,
  edgePadding = 8,
  maxWidth,
  withArrow = true,
  closeOnClick = false,
  tooltipClassName,
  disabled = false,
  addTabIndex = false,
  openOnClick = false,
}: TooltipProps) => {
  const tooltipId = useId()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const arrowRef = useRef<HTMLDivElement | null>(null)

  const modalRef = useModalRef()
  const portalRoot = modalRef?.current ?? undefined
  const usePortal = usePortalProp || Boolean(portalRoot)

  const placement = placementMap[position]

  useEffect(() => {
    setMounted(true)
  }, [])

  const middleware = useMemo(() => {
    const mw = [
      offset(offsetPx),
      shift({ padding: edgePadding }),
      flip({ fallbackAxisSideDirection: 'start' }),
      size({
        padding: edgePadding,
        apply: ({ availableWidth, elements }) => {
          if (maxWidth !== undefined) {
            const effectiveMaxWidth = Math.min(maxWidth, availableWidth)
            Object.assign(elements.floating.style, { maxWidth: `${Math.round(effectiveMaxWidth)}px` })
          }
        },
      }),
    ]
    if (withArrow) mw.push(arrowMw({ element: arrowRef }))
    return mw
  }, [offsetPx, edgePadding, maxWidth, withArrow])

  const {
    update,
    refs,
    elements,
    floatingStyles,
    placement: resolvedPlacement,
    middlewareData,
  } = useFloating({
    open,
    placement,
    strategy: 'absolute',
    middleware,
  })

  useEffect(() => {
    if (open && elements.floating && elements.reference) {
      const cleanup = autoUpdate(elements.reference, elements.floating, update)
      return () => cleanup()
    }
  }, [open, elements.floating, elements.reference, update])

  const hideTimeoutRef = useRef<number | null>(null)
  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current != null) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
  }, [])
  useEffect(() => () => clearHideTimeout(), [clearHideTimeout])

  const openNow = useCallback(() => {
    clearHideTimeout()
    setOpen(true)
  }, [clearHideTimeout])

  const closeSoon = useCallback(() => {
    clearHideTimeout()
    hideTimeoutRef.current = window.setTimeout(() => setOpen(false), 150)
  }, [clearHideTimeout])

  const onMouseEnter = () => {
    if (!disabled) openNow()
  }

  const onMouseLeave = () => closeSoon()
  const onFocus = () => {
    if (!disabled) openNow()
  }
  const onBlur = () => setOpen(false)

  const onClick = () => {
    if (closeOnClick) {
      closeSoon()
      const activeElement = document.activeElement as HTMLElement
      if (activeElement && activeElement !== document.body) {
        if (refs.reference.current instanceof HTMLElement && refs.reference.current.contains(activeElement)) {
          activeElement.blur()
        }
      }
      return
    }

    if (!disabled && openOnClick) {
      clearHideTimeout()
      setOpen((prev) => !prev)
    }
  }

  useEffect(() => {
    if (refs.reference.current instanceof Element) {
      const firstChild = refs.reference.current.firstElementChild as HTMLElement
      if (firstChild) {
        firstChild.setAttribute('aria-describedby', tooltipId)
      }
    }
  }, [tooltipId, refs.reference])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!open) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0] && entries[0].intersectionRatio === 0) setOpen(false)
      },
      { root: null, threshold: 0 }
    )
    const refEl = refs.reference.current
    if (refEl instanceof Element) io.observe(refEl)
    return () => io.disconnect()
  }, [open, refs.reference])

  const arrowStyles = useMemo<React.CSSProperties>(() => {
    if (!withArrow) return {}
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
  }, [middlewareData.arrow, resolvedPlacement, withArrow])

  const tooltipElement = (
    <AnimatePresence>
      {open && (
        <motion.div
          key={tooltipId}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          ref={refs.setFloating}
          id={tooltipId}
          role="tooltip"
          aria-hidden={!open}
          style={{ ...floatingStyles, zIndex: 10000 }}
          className={mergeClasses(
            'inline-block px-3 py-1.5 text-center break-words whitespace-normal',
            'bg-primary/95 text-foreground rounded-lg border border-white/10 text-xs font-semibold shadow-2xl backdrop-blur-xl',
            tooltipClassName
          )}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          {text}
          {withArrow && (
            <div
              ref={arrowRef}
              style={arrowStyles}
              className="absolute h-2 w-2 rotate-45 border-r border-b border-white/10 bg-primary"
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <div
      tabIndex={addTabIndex ? 0 : undefined}
      ref={refs.setReference}
      className={mergeClasses('inline-flex', className)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      onClick={onClick}
      aria-describedby={tooltipId}
    >
      {children}
      {mounted &&
        (usePortal
          ? portalRoot
            ? createPortal(tooltipElement, portalRoot)
            : typeof document !== 'undefined'
              ? createPortal(tooltipElement, document.body)
              : null
          : tooltipElement)}
    </div>
  )
}

export default Tooltip
