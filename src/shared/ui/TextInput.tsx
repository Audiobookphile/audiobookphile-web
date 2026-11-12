'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, Eye, EyeOff, X } from 'lucide-react'
import { useId, useState } from 'react'
import { useMergedRef } from '@/shared/hooks/useMergedRef'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { copyToClipboard } from '@/shared/lib/clipboard'
import { mergeClasses } from '@/shared/lib/merge-classes'
import InputWrapper from './InputWrapper'
import Label from './Label'

export interface TextInputProps {
  id?: string
  name?: string
  label?: string
  value?: string | number
  placeholder?: string
  readOnly?: boolean
  type?: string
  disabled?: boolean
  clearable?: boolean
  showCopy?: boolean
  step?: string | number
  min?: string | number
  customInputClass?: string
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send'
  onChange?: (value: string) => void
  onClear?: () => void
  onFocus?: () => void
  onBlur?: () => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  className?: string
  ref?: React.Ref<HTMLInputElement>
  error?: string
  /**
   * The HTML `autocomplete` attribute.
   *
   * The values this app uses are 'off', 'username', 'current-password',
   * 'new-password', 'email' and 'tel' -- plus 'one-time-code', which the
   * two-factor forms use and which the previous list had forgotten. The
   * attribute accepts any of the browser's tokens, so the honest type is
   * `string`.
   *
   * This used to be written as a union of those values plus `string`, which
   * reads as a constraint and is not one: the trailing `string` absorbs
   * them all.
   */
  autocomplete?: string
  borderless?: boolean
}

export default function TextInput({
  id,
  name,
  label,
  value,
  placeholder,
  readOnly = false,
  type = 'text',
  disabled = false,
  clearable = false,
  showCopy = false,
  step,
  min,
  customInputClass,
  enterKeyHint,
  onChange,
  onClear,
  onFocus,
  onBlur,
  onKeyDown,
  className,
  ref,
  error,
  autocomplete = 'off',
  borderless = false,
}: TextInputProps) {
  const t = useTypeSafeTranslations()
  const generatedId = useId()
  const textInputId = id || generatedId
  const inputId = `${textInputId}-input`

  const [readInputRef, writeInputRef] = useMergedRef<HTMLInputElement>(ref)

  const [showPassword, setShowPassword] = useState(false)
  const [hasCopied, setHasCopied] = useState<boolean | null>(null)
  const [isInvalidDate, setIsInvalidDate] = useState(false)

  const actualType = type === 'password' && showPassword ? 'text' : type
  const ariaLabel = label || placeholder || undefined
  const ariaInvalid = isInvalidDate

  const inputClass = mergeClasses(
    'w-full bg-transparent px-2 outline-none border-none h-full text-sm sm:text-base font-medium tracking-tight',
    'disabled:cursor-not-allowed disabled:text-disabled read-only:text-read-only',
    actualType === 'search' &&
      '[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden [&::-webkit-search-results-button]:hidden [&::-webkit-search-results-decoration]:hidden',
    '[&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer',
    showCopy || clearable || type === 'password' ? 'pe-10' : 'pe-2',
    customInputClass
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value)
  }

  const handleClear = () => {
    onChange?.('')
    onClear?.()
  }

  const handleFocus = () => {
    onFocus?.()
  }

  const handleBlur = () => {
    onBlur?.()
  }

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (type === 'datetime-local') {
      if (e.currentTarget.validity?.badInput) {
        setIsInvalidDate(true)
      } else {
        setIsInvalidDate(false)
      }
    }
  }

  const handleCopyToClipboard = async () => {
    if (hasCopied) return

    const textToCopy = value?.toString() ?? ''

    try {
      await copyToClipboard(textToCopy)
      setHasCopied(true)
      setTimeout(() => {
        setHasCopied(null)
      }, 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev)
  }

  const shouldShowPasswordToggle = type === 'password'

  return (
    <div className={mergeClasses('group w-full', className)} cy-id="text-input">
      {label && (
        <Label htmlFor={inputId} disabled={disabled}>
          {label}
        </Label>
      )}

      <InputWrapper
        disabled={disabled}
        readOnly={readOnly}
        error={error || isInvalidDate}
        inputRef={readInputRef}
        className={mergeClasses('relative', borderless ? 'border-none bg-transparent shadow-none' : '')}
      >
        <input
          ref={writeInputRef}
          id={inputId}
          name={name}
          value={value?.toString() ?? ''}
          autoComplete={autocomplete}
          type={actualType}
          step={step?.toString()}
          min={min?.toString()}
          readOnly={readOnly}
          disabled={disabled}
          placeholder={placeholder}
          dir="auto"
          className={inputClass}
          enterKeyHint={enterKeyHint}
          onChange={handleChange}
          onKeyUp={handleKeyUp}
          onKeyDown={onKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          aria-invalid={ariaInvalid}
          aria-label={ariaLabel}
          cy-id="text-input-field"
        />

        <div className="absolute end-1 top-0 flex h-full items-center gap-1 px-1">
          <AnimatePresence>
            {clearable && !!value && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                className="rounded-lg p-1.5 text-foreground/40 transition-colors outline-none hover:bg-white/5 hover:text-foreground focus-visible:ring-1 focus-visible:ring-primary"
                onClick={handleClear}
                aria-label={t('ButtonClearInput')}
                cy-id="text-input-clear"
              >
                <X size={14} strokeWidth={3} />
              </motion.button>
            )}

            {shouldShowPasswordToggle && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                className="rounded-lg p-1.5 text-foreground/40 transition-colors outline-none hover:bg-white/5 hover:text-foreground focus-visible:ring-1 focus-visible:ring-primary"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? t('ButtonHidePassword') : t('ButtonShowPassword')}
                aria-controls={inputId}
                cy-id="text-input-password-toggle"
              >
                {showPassword ? <EyeOff size={14} strokeWidth={2.5} /> : <Eye size={14} strokeWidth={2.5} />}
              </motion.button>
            )}

            {showCopy && type !== 'password' && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                className={mergeClasses(
                  'focus-visible:ring-primary rounded-lg p-1.5 transition-all outline-none focus-visible:ring-1',
                  hasCopied ? 'text-success bg-success/10' : 'text-foreground/40 hover:text-foreground hover:bg-white/5'
                )}
                onClick={handleCopyToClipboard}
                aria-label={hasCopied ? t('ButtonCopiedToClipboard') : t('ButtonCopyToClipboard')}
                cy-id="text-input-copy"
              >
                {hasCopied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} strokeWidth={2.5} />}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </InputWrapper>
    </div>
  )
}
