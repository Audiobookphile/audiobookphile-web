import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import React, { ReactNode, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ModalProvider } from '@/shared/contexts/ModalContext'
import { useClickOutside } from '@/shared/hooks/useClickOutside'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { mergeClasses } from '@/shared/lib/merge-classes'
import LoadingIndicator from '@/shared/ui/LoadingIndicator'

export interface ModalProps {
  isOpen: boolean
  processing?: boolean
  persistent?: boolean
  zIndexClass?: string
  bgOpacityClass?: string
  children?: ReactNode
  outerContent?: ReactNode
  sideNavigation?: ReactNode
  onClose?: () => void
  className?: string
  style?: React.CSSProperties
}

export default function Modal({
  isOpen,
  processing = false,
  persistent = false,
  zIndexClass = 'z-70',
  bgOpacityClass = 'bg-primary/40',
  children,
  outerContent,
  sideNavigation,
  onClose,
  className,
  style,
}: ModalProps) {
  const t = useTypeSafeTranslations()

  const wrapperRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const clickClose = useCallback(() => {
    if (processing || persistent) return
    onClose?.()
  }, [onClose, persistent, processing])

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (!isOpen || processing || persistent) return

      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        return
      }

      onClose?.()
    },
    [isOpen, processing, persistent, onClose]
  )

  useClickOutside(contentRef, null, handleClickOutside)

  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement
      requestAnimationFrame(() => {
        contentRef.current?.focus()
      })
    }
    return () => {
      if (isOpen && previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [isOpen])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && !processing && !persistent) {
        e.preventDefault()
        e.stopPropagation()
        onClose?.()
        return
      }

      if (e.key === 'Tab') {
        if (!contentRef.current) return

        const focusableElements = contentRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )

        if (focusableElements.length === 0) {
          e.preventDefault()
          contentRef.current.focus()
          return
        }

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]
        const isFocusInModal = contentRef.current.contains(document.activeElement)

        if (!isFocusInModal) {
          e.preventDefault()
          if (e.shiftKey) lastElement.focus()
          else firstElement.focus()
        } else {
          if (e.shiftKey) {
            if (document.activeElement === firstElement || document.activeElement === contentRef.current) {
              e.preventDefault()
              lastElement.focus()
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault()
              firstElement.focus()
            }
          }
        }
      }
    },
    [processing, persistent, onClose]
  )

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={wrapperRef}
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={mergeClasses(
            'modal modal-bg fixed start-0 top-0 flex h-full w-full items-center justify-center overflow-x-hidden backdrop-blur-sm',
            zIndexClass,
            bgOpacityClass
          )}
          cy-id="modal-wrapper"
          onKeyDown={handleKeyDown}
        >
          {/* Background gradient */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 w-full bg-gradient-to-b from-black/20 to-transparent" />

          {/* Close button */}
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute end-4 top-4 z-20 inline-flex items-center justify-center rounded-full bg-black/20 p-2 text-foreground-muted backdrop-blur-md transition-colors hover:bg-black/40 hover:text-foreground"
            aria-label={t('ButtonCloseModal')}
            onClick={clickClose}
            cy-id="modal-close-button"
          >
            <X size={24} />
          </motion.button>

          {/* Outer content slot */}
          {outerContent}

          {/* Focus trap + optional side rails + panel */}
          <motion.div
            ref={contentRef}
            tabIndex={0}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{ willChange: 'transform, opacity' }}
            className="relative outline-none focus:outline-none"
            cy-id="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {sideNavigation}
            <div
              style={style}
              className={mergeClasses(
                'text-foreground bg-bg/95 relative rounded-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur-md',
                'w-[calc(100vw-2rem)] max-w-[95vw] overflow-hidden sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px]',
                className
              )}
              cy-id="modal-panel"
            >
              <ModalProvider modalRef={wrapperRef as React.RefObject<HTMLDivElement>}>{children}</ModalProvider>

              {/* Processing overlay */}
              <AnimatePresence>
                {processing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 flex h-full w-full items-center justify-center bg-gray-900/60 backdrop-blur-[1px]"
                    cy-id="modal-processing-overlay"
                  >
                    <LoadingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  if (typeof window === 'undefined') return null
  return createPortal(modalContent, document.body)
}
