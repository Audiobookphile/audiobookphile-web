'use client'
import type { TargetAndTransition, Transition, VariantLabels } from 'framer-motion'
import { motion } from 'framer-motion'
import Link from 'next/link'
import React from 'react'
import { mergeClasses } from '@/shared/lib/merge-classes'

const MotionLink = motion.create(Link)

interface ButtonBaseProps {
  id?: string
  to?: string
  prefetch?: boolean
  children: React.ReactNode
  disabled?: boolean
  borderless?: boolean
  size?: 'small' | 'medium' | 'large' | 'auto' | 'custom'
  onClick?: (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void
  onMouseDown?: (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement | HTMLAnchorElement>) => void
  type?: 'button' | 'submit' | 'reset'
  ariaLabel?: string
  className?: string
  ref?: React.Ref<HTMLButtonElement>
  whileHover?: TargetAndTransition | VariantLabels
  whileTap?: TargetAndTransition | VariantLabels
  transition?: Transition

  // The standard attributes a button or an anchor accepts.
  //
  // These were previously covered by an `[key: string]: any` index
  // signature, which accepted any prop at all -- including a misspelled one.
  // Declaring them means a typo is a type error, and the spread onto the
  // motion element is checked rather than assumed.
  role?: React.AriaRole
  tabIndex?: number
  style?: React.CSSProperties
  title?: string
  name?: string
  form?: string
  autoFocus?: boolean
  onFocus?: React.FocusEventHandler<HTMLButtonElement | HTMLAnchorElement>
  onBlur?: React.FocusEventHandler<HTMLButtonElement | HTMLAnchorElement>
  onMouseEnter?: React.MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>
  onMouseLeave?: React.MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>
  'aria-label'?: string
  'aria-checked'?: boolean
  'aria-pressed'?: boolean | 'mixed'
  'aria-expanded'?: boolean
  'aria-hidden'?: boolean
  'aria-describedby'?: string
  'aria-labelledby'?: string
  'aria-controls'?: string
  'data-cyid'?: string
}

const ButtonBase = ({
  id,
  to,
  prefetch = true,
  children,
  disabled = false,
  borderless = false,
  size = 'medium',
  className = '',
  onClick,
  onMouseDown,
  onKeyDown,
  type = 'button',
  ariaLabel,
  ref,
  whileHover,
  whileTap,
  transition,
  ...props
}: ButtonBaseProps) => {
  const buttonClass = mergeClasses(
    'relative flex items-center justify-center overflow-hidden transition-all duration-200 select-none font-sans font-semibold',
    'rounded-2xl border shadow-md shadow-black/20',
    !borderless && 'bg-white/10 backdrop-blur-md border-white/15 hover:border-white/30 hover:bg-white/15',
    borderless && 'border-transparent bg-transparent shadow-none text-foreground/60 hover:text-foreground',

    // Focus states
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-black',

    // Sizing
    size === 'small'
      ? 'h-9 px-4 text-sm'
      : size === 'large'
        ? 'h-12 px-10 text-lg'
        : size === 'auto'
          ? 'min-h-10 h-auto px-6'
          : size === 'custom'
            ? ''
            : 'h-10 px-8 text-base',

    // Disabled states
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:grayscale aria-disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:grayscale',

    className
  )

  const handleClick = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    if (onClick && !disabled) {
      onClick(e)
    }
  }

  const animationProps = !disabled
    ? {
        whileHover: whileHover ?? { scale: 1.03, y: -1 },
        whileTap: whileTap ?? { scale: 0.96 },
        transition: transition ?? { type: 'spring', stiffness: 450, damping: 22 },
      }
    : {}

  if (to) {
    return (
      <MotionLink
        id={id}
        href={to}
        prefetch={prefetch}
        className={buttonClass}
        onClick={handleClick}
        onMouseDown={onMouseDown}
        onKeyDown={onKeyDown}
        style={{ pointerEvents: disabled ? 'none' : 'auto' }}
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label={ariaLabel}
        {...animationProps}
        {...props}
      >
        {children}
      </MotionLink>
    )
  }

  return (
    <motion.button
      id={id}
      ref={ref}
      type={type}
      disabled={disabled}
      className={buttonClass}
      onClick={handleClick}
      onMouseDown={onMouseDown}
      onKeyDown={onKeyDown}
      aria-label={ariaLabel}
      {...animationProps}
      {...props}
    >
      {children}
    </motion.button>
  )
}

export default ButtonBase
