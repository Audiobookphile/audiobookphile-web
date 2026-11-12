import { motion } from 'framer-motion'
import { Check, Edit2, X } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { mergeClasses } from '@/shared/lib/merge-classes'

interface PillProps<T> {
  item: T
  id: string
  isFocused: boolean
  disabled: boolean
  showEditButton: boolean
  isEditing?: boolean
  getEditableText?: (item: T) => string
  getReadOnlyPrefix?: (item: T) => string
  getFullText?: (item: T) => string
  onMutate?: (prev: T | null, value: string) => T
  onValidate?: (content: T) => string | null
  onValidationError?: (error: string) => void
  onEditButtonClick?: () => void
  onClick: () => void
  onEdit?: (item: T) => void
  onRemove: (item: T) => void
  onEditDone?: (shouldRefocus?: boolean, cancelled?: boolean) => void
}

export const Pill = <T,>({
  item,
  id,
  isFocused,
  disabled,
  showEditButton,
  isEditing = false,
  getEditableText,
  getReadOnlyPrefix,
  getFullText,
  onMutate,
  onValidate,
  onValidationError,
  onEditButtonClick,
  onClick,
  onEdit,
  onRemove,
  onEditDone,
}: PillProps<T>) => {
  const t = useTypeSafeTranslations()
  const [isInputReady, setIsInputReady] = useState(false)
  const [hasValidationError, setHasValidationError] = useState(false)

  const itemText = getEditableText ? getEditableText(item) : String(item)
  const readOnlyPrefix = getReadOnlyPrefix ? getReadOnlyPrefix(item) : undefined
  const fullText = getFullText ? getFullText(item) : itemText

  const [inputValue, setInputValue] = useState(itemText)

  const editInputRef = useRef<HTMLInputElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const saveButtonRef = useRef<HTMLButtonElement>(null)
  const sizerRef = useRef<HTMLSpanElement>(null)
  const prefixRef = useRef<HTMLSpanElement>(null)
  const inputWidthRef = useRef<number>(0)
  const pillContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isEditing) {
      setInputValue(itemText)
    }
  }, [isEditing, itemText])

  const updatePillMaxWidth = useCallback(() => {
    if (pillContainerRef.current) {
      const pillElement = pillContainerRef.current
      const parentElement = pillElement.parentElement
      if (!parentElement) return

      const parentStyle = window.getComputedStyle(parentElement)
      const parentPaddingLeft = parseFloat(parentStyle.paddingLeft)
      const parentPaddingRight = parseFloat(parentStyle.paddingRight)
      const parentContentWidth = parentElement.clientWidth - parentPaddingLeft - parentPaddingRight

      const pillStyle = window.getComputedStyle(pillElement)
      const pillMarginLeft = parseFloat(pillStyle.marginLeft)
      const pillMarginRight = parseFloat(pillStyle.marginRight)

      const maxPillWidth = parentContentWidth - pillMarginLeft - pillMarginRight
      pillElement.style.maxWidth = `${maxPillWidth}px`
    }
  }, [])

  useEffect(() => {
    if (isEditing) {
      const pillContainer = pillContainerRef.current
      updatePillMaxWidth()
      window.addEventListener('resize', updatePillMaxWidth)

      return () => {
        window.removeEventListener('resize', updatePillMaxWidth)
        if (pillContainer) {
          pillContainer.style.maxWidth = ''
        }
      }
    }
  }, [isEditing, updatePillMaxWidth])

  useEffect(() => {
    if (isEditing && editInputRef.current && isInputReady) {
      editInputRef.current.focus()
    }
  }, [isEditing, isInputReady])

  useEffect(() => {
    if (isEditing && sizerRef.current && !isInputReady) {
      if (sizerRef.current) {
        if (inputValue) {
          const sizerWidth = sizerRef.current.getBoundingClientRect().width
          const newWidth = sizerWidth
          inputWidthRef.current = newWidth
        } else {
          inputWidthRef.current = 0
        }
        setIsInputReady(true)
      }
    }
  }, [isEditing, inputValue, isInputReady])

  useEffect(() => {
    if (isEditing && sizerRef.current && isInputReady) {
      if (sizerRef.current) {
        const sizerWidth = sizerRef.current.getBoundingClientRect().width
        const newWidth = sizerWidth
        inputWidthRef.current = newWidth
        editInputRef.current?.style.setProperty('width', `${newWidth}px`)
      }
    }
  }, [inputValue, isEditing, isInputReady])

  const handleEditButtonClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled && showEditButton) {
      onEditButtonClick?.()
    }
  }

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleSaveEdit = () => {
    const trimmedInput = inputValue.trim()
    const newContent = onMutate ? onMutate(item, trimmedInput) : (trimmedInput as T)

    const error = onValidate?.(newContent)
    setHasValidationError(!!error)
    if (error) {
      onValidationError?.(error)
      return
    }

    const isEmpty = getFullText ? getFullText(newContent) === '' : trimmedInput === ''

    if (!isEmpty) {
      onEdit?.(newContent)
    }

    onEditDone?.(true, false)
  }

  const handleCancelEdit = () => {
    setInputValue(itemText)
    setHasValidationError(false)
    onEditDone?.(true, true)
  }

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const newFocusTarget = e.relatedTarget as HTMLElement
    if (!pillContainerRef.current?.contains(newFocusTarget)) {
      onEditDone?.(false, true)
    }
  }

  const handleEditInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancelEdit()
    }
  }

  const handlePillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const focusableElements = [editInputRef.current, cancelButtonRef.current, saveButtonRef.current].filter(
        Boolean
      ) as HTMLElement[]
      const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement)
      const nextIndex = e.shiftKey
        ? (currentIndex - 1 + focusableElements.length) % focusableElements.length
        : (currentIndex + 1) % focusableElements.length
      focusableElements[nextIndex]?.focus()
    }
  }

  return (
    <motion.div
      layout
      ref={pillContainerRef}
      id={id}
      cy-id={id}
      role="listitem"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={mergeClasses(
        'group relative mx-1 my-0.5 flex flex-nowrap items-center justify-center rounded-full px-3 py-1 text-xs font-medium transition-all',
        isEditing
          ? 'z-10 bg-white/10 shadow-lg ring-1 ring-white/20'
          : 'text-foreground/80 hover:text-foreground border border-white/5 bg-white/5 hover:bg-white/10',
        !disabled && isFocused && !isEditing ? 'ring-primary border-primary/50 ring-2' : '',
        hasValidationError && 'ring-error border-error/50 ring-2'
      )}
      tabIndex={-1}
      onMouseDown={(e) => e.preventDefault()}
      onKeyDown={isEditing ? handlePillKeyDown : undefined}
      onClick={
        !isEditing
          ? (e) => {
              e.preventDefault()
              e.stopPropagation()
              onClick()
            }
          : undefined
      }
    >
      {isEditing ? (
        <>
          <span ref={sizerRef} className="invisible absolute px-1 text-xs whitespace-pre">
            {inputValue}
          </span>
          <div className="inline-flex items-center" style={{ maxWidth: '80%' }}>
            {readOnlyPrefix && (
              <span ref={prefixRef} className="me-1 text-xs text-foreground/40 select-none">
                {readOnlyPrefix}
              </span>
            )}
            {isInputReady && (
              <input
                ref={editInputRef}
                type="text"
                value={inputValue}
                onChange={handleEditInputChange}
                onKeyDown={handleEditInputKeyDown}
                onBlur={handleInputBlur}
                className="border-none bg-transparent text-center text-xs font-medium outline-none placeholder:text-white/20"
                style={{ minWidth: '4px', width: `${inputWidthRef.current}px`, maxWidth: '100%' }}
                autoComplete="off"
                aria-label={t('LabelEditItem', { item: readOnlyPrefix ? readOnlyPrefix + itemText : itemText })}
              />
            )}
          </div>
          <div className="ms-2 flex items-center gap-1.5" role="group">
            <button
              type="button"
              className="rounded-full p-1 text-foreground/40 transition-all outline-none hover:bg-error/10 hover:text-error focus:ring-1 focus:ring-error"
              onClick={handleCancelEdit}
              ref={cancelButtonRef}
            >
              <X size={14} strokeWidth={3} />
            </button>
            <button
              type="button"
              className="rounded-full p-1 text-foreground/40 transition-all outline-none hover:bg-success/10 hover:text-success focus:ring-1 focus:ring-success"
              onClick={handleSaveEdit}
              ref={saveButtonRef}
            >
              <Check size={14} strokeWidth={3} />
            </button>
          </div>
        </>
      ) : (
        <>
          <span className="relative z-0 max-w-[150px] truncate">{fullText}</span>
          {!disabled && (
            <div className="ms-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {showEditButton && (
                <button
                  type="button"
                  className="rounded-full p-1 text-foreground/40 transition-colors outline-none hover:text-primary focus:ring-1 focus:ring-primary"
                  onClick={handleEditButtonClick}
                  tabIndex={-1}
                >
                  <Edit2 size={12} strokeWidth={2.5} />
                </button>
              )}
              <button
                type="button"
                className="rounded-full p-1 text-foreground/40 transition-colors outline-none hover:text-error focus:ring-1 focus:ring-error"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(item)
                }}
                tabIndex={-1}
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </>
      )}
    </motion.div>
  )
}

export default Pill
