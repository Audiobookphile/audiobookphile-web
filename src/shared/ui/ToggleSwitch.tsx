import { motion } from 'framer-motion'
import React, { useId, useRef } from 'react'
import { mergeClasses } from '@/shared/lib/merge-classes'
import InputWrapper from './InputWrapper'

interface ToggleSwitchProps {
  value?: boolean
  size?: 'small' | 'medium' | 'large'
  onColor?: 'success' | 'primary' | 'warning' | 'error'
  offColor?: 'success' | 'primary' | 'warning' | 'error'
  disabled?: boolean
  onChange?: (value: boolean) => void
  label?: string
  ariaLabel?: string
  ariaLabelledBy?: string
  className?: string
}

export default function ToggleSwitch({
  value = false,
  label,
  size = 'medium',
  onColor = 'success',
  offColor = 'primary',
  disabled = false,
  onChange,
  ariaLabel = '',
  ariaLabelledBy = '',
  className = '',
}: ToggleSwitchProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const id = useId()
  const toggleId = `${id}-toggle`
  const labelId = `${id}-label`

  const colorMap: Record<string, string> = {
    success: 'bg-primary',
    primary: 'bg-white/10',
    warning: 'bg-warning',
    error: 'bg-error',
  }
  const bgColorClasses = value ? colorMap[onColor] : colorMap[offColor]

  const widthClasses = size === 'small' ? 'w-8 h-4.5' : size === 'medium' ? 'w-10 h-6' : 'w-12 h-7.5'
  const buttonClassName = mergeClasses(
    'relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    bgColorClasses,
    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer group',
    widthClasses
  )

  const knobSize = size === 'small' ? 'h-3.5 w-3.5' : size === 'medium' ? 'h-5 w-5' : 'h-6.5 w-6.5'

  const triggerChange = () => {
    if (!disabled) {
      onChange?.(!value)
    }
  }

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    triggerChange()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      triggerChange()
    }
  }

  const derivedAriaLabel = label ? undefined : ariaLabel
  const derivedAriaLabelledBy = label ? labelId : ariaLabelledBy

  return (
    <InputWrapper disabled={disabled} borderless size={size} className={mergeClasses('bg-transparent', className)}>
      <div cy-id="toggle-and-label-wrapper" ref={wrapperRef} className="flex items-center justify-start px-1 py-1.5">
        <button
          ref={buttonRef}
          id={toggleId}
          type="button"
          role="switch"
          aria-checked={value}
          aria-label={derivedAriaLabel}
          aria-labelledby={derivedAriaLabelledBy}
          disabled={disabled}
          className={buttonClassName}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
        >
          <motion.span
            animate={{
              x: value ? (size === 'small' ? 16 : size === 'medium' ? 18 : 20) : 2,
              scale: value ? 1.05 : 1,
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={mergeClasses(
              'pointer-events-none block rounded-full bg-white shadow-lg ring-0 transition-transform',
              knobSize
            )}
          />
        </button>
        {label && (
          <label
            cy-id="toggle-label"
            id={labelId}
            className={mergeClasses(
              'cursor-pointer ps-3 font-medium transition-colors select-none',
              size === 'small'
                ? 'text-xs sm:text-sm'
                : size === 'medium'
                  ? 'text-sm sm:text-base'
                  : 'text-base sm:text-lg',
              disabled ? 'text-disabled' : 'text-foreground/80 hover:text-foreground'
            )}
            htmlFor={toggleId}
          >
            {label}
          </label>
        )}
      </div>
    </InputWrapper>
  )
}
