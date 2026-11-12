'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Minus } from 'lucide-react'
import React, { useId, useRef } from 'react'
import { mergeClasses } from '@/shared/lib/merge-classes'
import InputWrapper from './InputWrapper'

interface CheckboxProps {
  value?: boolean
  label?: string
  size?: 'small' | 'medium' | 'large'
  checkboxBgClass?: string
  borderColorClass?: string
  checkColorClass?: string
  labelClass?: string
  disabled?: boolean
  partial?: boolean
  ariaLabel?: string
  onChange?: (value: boolean) => void
  className?: string
}

export default function Checkbox({
  value = false,
  label,
  size = 'medium',
  checkboxBgClass = 'bg-primary/20',
  borderColorClass = 'border-white/10 group-hover:border-primary/50',
  checkColorClass = 'text-primary-foreground',
  labelClass = '',
  disabled = false,
  partial = false,
  ariaLabel = '',
  onChange,
  className = '',
}: CheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const checkboxId = useId()

  const sizePx = size === 'small' ? 16 : size === 'medium' ? 20 : 24
  const sizeClass = size === 'small' ? 'w-4 h-4' : size === 'medium' ? 'w-5 h-5' : 'w-6 h-6'

  const checkboxWrapperClassName = mergeClasses(
    'rounded-md flex shrink-0 justify-center items-center border transition-all duration-200',
    checkboxBgClass,
    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
    value || partial ? 'bg-primary border-primary' : borderColorClass,
    sizeClass
  )

  const labelSizeClass =
    size === 'small'
      ? 'text-xs sm:text-sm ps-2'
      : size === 'medium'
        ? 'text-sm sm:text-base ps-3'
        : 'text-base sm:text-lg ps-3'
  const checkboxLabelClassName = mergeClasses(
    labelSizeClass,
    'font-medium select-none transition-colors',
    disabled ? 'text-disabled' : 'text-foreground/80 group-hover:text-foreground',
    labelClass
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) {
      onChange?.(e.target.checked)
    }
  }

  return (
    <InputWrapper
      disabled={disabled}
      borderless
      size={size}
      className={mergeClasses('bg-transparent', className)}
      inputRef={inputRef}
    >
      <div
        cy-id="checkbox-and-label-wrapper"
        className="group relative flex cursor-pointer items-center justify-start px-1 py-1.5"
      >
        <div cy-id="checkbox-wrapper" className={checkboxWrapperClassName}>
          <AnimatePresence mode="wait">
            {partial ? (
              <motion.div
                key="partial"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <Minus size={sizePx - 4} strokeWidth={4} className={checkColorClass} />
              </motion.div>
            ) : value ? (
              <motion.div
                key="check"
                initial={{ scale: 0.5, opacity: 0, pathLength: 0 }}
                animate={{ scale: 1, opacity: 1, pathLength: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <Check size={sizePx - 4} strokeWidth={4} className={checkColorClass} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {label && (
          <span cy-id="checkbox-label" className={checkboxLabelClassName}>
            {label}
          </span>
        )}

        <input
          ref={inputRef}
          id={checkboxId}
          type="checkbox"
          checked={value}
          disabled={disabled}
          aria-label={ariaLabel || label}
          onChange={handleChange}
          className="absolute inset-0 h-full w-full cursor-pointer rounded-md opacity-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none"
        />
      </div>
    </InputWrapper>
  )
}
