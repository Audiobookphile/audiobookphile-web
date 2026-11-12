import React from 'react'
import { mergeClasses } from '@/shared/lib/merge-classes'
import AppIcon from '@/shared/ui/AppIcon'
import Tooltip from '@/shared/ui/Tooltip'

interface IndicatorProps {
  tooltipText: string
  children?: React.ReactNode
  className?: string
  ariaLabel?: string
  role?: string
}

const Indicator = ({ tooltipText, children, className, ariaLabel, role = 'note' }: IndicatorProps) => {
  const effectiveAriaLabel = ariaLabel || tooltipText

  if (typeof children === 'string') {
    return (
      <Tooltip text={tooltipText} position="top">
        <div
          className={mergeClasses('flex items-center justify-center', className)}
          role={role}
          aria-label={effectiveAriaLabel}
        >
          <AppIcon name={children} size={14} strokeWidth={2.5} />
        </div>
      </Tooltip>
    )
  }

  if (children && typeof children === 'object' && 'render' in (children as { render?: unknown })) {
    const Icon = children as unknown as React.ComponentType<{ size?: number; strokeWidth?: number }>
    return (
      <Tooltip text={tooltipText} position="top">
        <div
          className={mergeClasses('flex items-center justify-center', className)}
          role={role}
          aria-label={effectiveAriaLabel}
        >
          <Icon size={14} strokeWidth={2.5} />
        </div>
      </Tooltip>
    )
  }

  return (
    <Tooltip text={tooltipText} position="top">
      <div className={className} role={role} aria-label={effectiveAriaLabel}>
        {children}
      </div>
    </Tooltip>
  )
}

export default Indicator
