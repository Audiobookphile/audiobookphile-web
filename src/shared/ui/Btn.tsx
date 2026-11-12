'use client'

import { AnimatePresence, motion } from 'framer-motion'
import React, { memo, useId } from 'react'
import { mergeClasses } from '@/shared/lib/merge-classes'
import ButtonBase from './ButtonBase'

interface BtnProps {
  to?: string
  color?: string
  type?: 'button' | 'submit' | 'reset'
  size?: 'small' | 'medium' | 'large'
  loading?: boolean
  disabled?: boolean
  progress?: string
  loadingMessage?: string
  children: React.ReactNode
  onClick?: (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void
  className?: string
  ariaLabel?: string
  ariaDescription?: string
  ariaExpanded?: boolean
  ariaControls?: string
}

const LoadingOverlay = memo<{ progress?: string }>(({ progress }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      aria-hidden="true"
    >
      {progress ? (
        <span className="text-xs font-bold tracking-tight text-white">{progress}</span>
      ) : (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white"
        />
      )}
    </motion.div>
  )
})

LoadingOverlay.displayName = 'LoadingOverlay'

export default function Btn({
  to,
  color = 'bg-primary',
  type = 'button',
  size = 'medium',
  loading = false,
  disabled = false,
  progress,
  loadingMessage = 'Loading...',
  children,
  onClick,
  className = '',
  ariaLabel,
  ariaDescription,
  ariaExpanded,
  ariaControls,
}: BtnProps) {
  const descriptionId = useId()
  const handleClick = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    if (onClick && !disabled && !loading) {
      onClick(e)
    }
  }

  return (
    <ButtonBase
      to={to}
      size={size}
      className={mergeClasses('relative font-bold tracking-tight', color, className)}
      disabled={disabled || loading}
      type={type}
      onClick={handleClick}
      ariaLabel={ariaLabel}
      aria-busy={loading || undefined}
      aria-describedby={ariaDescription ? descriptionId : undefined}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
    >
      <motion.span
        animate={{ opacity: loading ? 0 : 1, scale: loading ? 0.9 : 1 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-center gap-2"
      >
        {children}
      </motion.span>

      <AnimatePresence>{loading && <LoadingOverlay progress={progress} />}</AnimatePresence>

      {ariaDescription && (
        <span id={descriptionId} className="sr-only">
          {ariaDescription}
        </span>
      )}

      {loading && (
        <span className="sr-only" role="status" aria-live="polite">
          {progress ? progress : loadingMessage}
        </span>
      )}
    </ButtonBase>
  )
}
