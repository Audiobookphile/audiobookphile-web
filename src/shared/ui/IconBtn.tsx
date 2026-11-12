'use client'

import type { TargetAndTransition, Transition, VariantLabels } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import React, { memo } from 'react'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { mergeClasses } from '@/shared/lib/merge-classes'
import AppIcon, { getIconLabel } from './AppIcon'
import ButtonBase from './ButtonBase'

interface IconBtnProps {
  children?: React.ReactNode
  icon?: LucideIcon
  disabled?: boolean
  outlined?: boolean
  borderless?: boolean
  loading?: boolean
  isActive?: boolean
  size?: 'small' | 'medium' | 'large' | 'auto' | 'custom'
  iconClass?: string
  ariaLabel?: string
  to?: string
  onClick?: (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void
  onMouseDown?: (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement | HTMLAnchorElement>) => void
  'aria-pressed'?: boolean
  className?: string
  ref?: React.Ref<HTMLButtonElement>
  tabIndex?: number
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
  'aria-expanded'?: boolean
  'aria-hidden'?: boolean
  'aria-describedby'?: string
  'aria-labelledby'?: string
  'aria-controls'?: string
  'data-cyid'?: string
}

const LoadingSpinner = memo(() => (
  <div
    cy-id="icon-btn-loading-spinner"
    className="absolute start-0 top-0 flex h-full w-full items-center justify-center text-current"
    aria-hidden="true"
  >
    <svg className="animate-spin" style={{ width: '1.2em', height: '1.2em' }} viewBox="0 0 24 24">
      <path fill="currentColor" d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" />
    </svg>
  </div>
))

LoadingSpinner.displayName = 'LoadingSpinner'

export default function IconBtn({
  children,
  icon: Icon,
  disabled = false,
  outlined = true,
  borderless = false,
  loading = false,
  isActive = false,
  size = 'medium',
  iconClass,
  ariaLabel,
  to,
  onClick,
  onMouseDown,
  onKeyDown,
  'aria-pressed': ariaPressed,
  className = '',
  ref,
  tabIndex,
  whileHover,
  whileTap,
  transition,
  ...props
}: IconBtnProps) {
  const t = useTypeSafeTranslations()
  const isDisabled = disabled || loading

  const sizeClass =
    size === 'small' ? 'w-9' : size === 'large' ? 'w-11' : size === 'medium' ? 'w-10' : size === 'auto' ? 'w-auto' : ''
  const activeClass = isActive ? 'bg-primary/20 text-primary border-primary/40 shadow-primary/20' : ''
  const classList = mergeClasses(sizeClass, activeClass, className)
  const legacyIconName = typeof children === 'string' ? children.trim() : null
  const accessibleLabel = ariaLabel ?? (legacyIconName ? getIconLabel(legacyIconName) : 'Button')

  const iconSize = size === 'small' ? 18 : size === 'large' ? 24 : 20

  const handleClick = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    if (isDisabled) {
      e.preventDefault()
      return
    }
    onClick?.(e)
  }

  return (
    <ButtonBase
      ref={ref}
      size={size}
      disabled={isDisabled}
      borderless={borderless || !outlined}
      to={to}
      onClick={handleClick}
      onMouseDown={onMouseDown}
      onKeyDown={onKeyDown}
      className={classList}
      aria-label={accessibleLabel}
      aria-busy={loading || undefined}
      aria-pressed={ariaPressed}
      tabIndex={tabIndex}
      whileHover={whileHover ?? { scale: 1.1 }}
      whileTap={whileTap ?? { scale: 0.9 }}
      transition={transition ?? { type: 'spring', stiffness: 400, damping: 17 }}
      {...props}
    >
      {loading && <LoadingSpinner />}
      {loading && (
        <span cy-id="icon-btn-loading" className="sr-only">
          {t('LabelLoadingIndicator')}
        </span>
      )}
      {!loading && (
        <>
          {Icon ? (
            <Icon size={iconSize} className={mergeClasses('shrink-0', iconClass)} aria-hidden="true" />
          ) : legacyIconName ? (
            <AppIcon name={legacyIconName} size={iconSize} className={mergeClasses('shrink-0', iconClass)} />
          ) : (
            <span cy-id="icon-btn-icon" className={mergeClasses(iconClass)} aria-hidden="true">
              {children}
            </span>
          )}
        </>
      )}
    </ButtonBase>
  )
}
