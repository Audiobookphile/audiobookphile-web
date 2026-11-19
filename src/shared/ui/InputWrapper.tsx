'use client'

import { mergeClasses } from '@/shared/lib/merge-classes'

export interface InputWrapperProps {
  children: React.ReactNode
  disabled?: boolean
  readOnly?: boolean
  error?: boolean | string
  borderless?: boolean
  size?: 'small' | 'medium' | 'large' | 'auto'
  className?: string
  inputRef?: React.RefObject<HTMLElement | null>
}

const InputWrapper = ({
  children,
  disabled = false,
  readOnly = false,
  error = false,
  borderless = false,
  size = 'medium',
  className,
  inputRef,
}: InputWrapperProps) => {
  const wrapperClass = mergeClasses(
    // Base styles
    'relative flex items-stretch rounded-lg px-2 has-[:focus-visible]:outline transition-all duration-200',

    // Size-based padding
    size === 'small' ? 'h-9' : size === 'large' ? 'h-11' : size === 'auto' ? 'h-full' : 'h-10',

    // Border and focus styles
    error ? 'border-error focus-within:outline-error' : 'border-white/10',

    // Background styles based on state
    disabled
      ? 'bg-bg-disabled cursor-not-allowed border-bg-disabled'
      : readOnly
        ? 'bg-bg-read-only'
        : borderless
          ? 'bg-transparent'
          : 'liquid-glass-input',

    // Borderless styles
    borderless ? 'border-0' : 'border',

    // Custom className
    className
  )

  const handleClick = () => {
    if (!disabled) {
      if (document.activeElement !== inputRef?.current) {
        inputRef?.current?.focus()
      }
    }
  }

  return (
    <>
      <div className={wrapperClass} cy-id="control-wrapper" onClick={handleClick}>
        {children}
      </div>
      {error && <div className="mt-1 text-sm text-error">{typeof error === 'string' ? error : 'Invalid value'}</div>}
    </>
  )
}

export default InputWrapper
