'use client'
import type { RefObject } from 'react'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { mergeClasses } from '@/shared/lib/merge-classes'
import DropdownMenu from './DropdownMenu'
import InputWrapper from './InputWrapper'
import Label from './Label'
import { useMultiSelect } from './multi-select/useMultiSelect'
import Pill from './Pill'

export interface MultiSelectItem<T = string> {
  value: string
  content: T
}

export interface MultiSelectProps<T = string> {
  value?: string
  /**
   * Optional, defaulting to an empty list.
   *
   * The prop was typed as required while the destructuring gave it a
   * default, which made the default unreachable for every typed caller --
   * the type forced the prop to be passed, so the default only ever fired
   * for a caller that passed `undefined` explicitly. Marking it optional
   * describes what the code actually does.
   */
  selectedItems?: MultiSelectItem<T>[]
  items: MultiSelectItem<string>[]
  label?: string
  disabled?: boolean
  showEdit?: boolean
  showInput?: boolean
  allowNew?: boolean
  menuDisabled?: boolean
  editingPillIndex?: number | null

  // Pill content introspection callbacks
  getEditableText?: (content: T) => string
  getReadOnlyPrefix?: (content: T) => string
  getFullText?: (content: T) => string

  // MultiSelect content introspection callbacks
  getItemTextId?: (content: T) => string

  // Content mutation callback
  onMutate?: (prev: T | null, text: string) => T

  // Validation callback
  onValidate?: (content: T) => string | null // Returns error message or null if valid
  onValidationError?: (error: string) => void
  onDuplicateError?: (message: string) => void

  // Event handlers
  onItemEdited?: (item: MultiSelectItem<T>, index: number) => void
  onItemAdded?: (item: MultiSelectItem<T>) => void
  onItemRemoved?: (item: MultiSelectItem<T>) => void
  onInputChange?: (value: string) => void
  onEditingPillIndexChange?: (index: number | null) => void
  onEditDone?: (cancelled?: boolean) => void
}

export function MultiSelect<T = string>({
  value,
  selectedItems = [],
  items,
  label,
  disabled = false,
  showEdit = false,
  showInput = true,
  allowNew = true,
  menuDisabled = false,
  editingPillIndex: controlledEditingPillIndex,
  getEditableText,
  getReadOnlyPrefix,
  getFullText,
  getItemTextId: getItemTextIdProp,
  onMutate: onMutateProp,
  onValidate,
  onValidationError,
  onDuplicateError,
  onItemEdited,
  onItemAdded,
  onItemRemoved,
  onInputChange,
  onEditingPillIndexChange,
  onEditDone,
}: MultiSelectProps<T>) {
  const t = useTypeSafeTranslations()

  const {
    textInput,
    focusIndex,
    editingPillIndex,
    multiSelectId,
    selectedItemValues,
    wrapperRef,
    inputWrapperRef,
    inputRef,
    sizerRef,
    showMenu,
    dropdownItems,
    setEditingPillIndex,
    handleInputChange,
    handleDropdownItemClick,
    isItemSelected,
    inputFocus,
    inputBlur,
    inputPaste,
    handleKeyDown,
    handlePillEdit,
    handlePillEditDone,
    removeItem,
    onMutate,
    setIsMenuOpen,
    setFocusIndex,
  } = useMultiSelect({
    value,
    selectedItems,
    items,
    disabled,
    showEdit,
    allowNew,
    menuDisabled,
    editingPillIndex: controlledEditingPillIndex,
    getItemTextId: getItemTextIdProp,
    onMutate: onMutateProp,
    onValidate,
    onValidationError,
    onDuplicateError,
    onItemEdited,
    onItemAdded,
    onItemRemoved,
    onInputChange,
    onEditingPillIndexChange,
    onEditDone,
  })

  // Compute the id of the currently focused descendant for aria-activedescendant
  let activeDescendantId: string | undefined = undefined
  if (focusIndex !== null) {
    if (focusIndex < 0) {
      // pill
      const pillIdx = selectedItemValues.length + focusIndex
      if (pillIdx >= 0) activeDescendantId = `${multiSelectId}-pill-${pillIdx}`
    } else {
      // menu item
      activeDescendantId = `${multiSelectId}-menuitem-${focusIndex}`
    }
  }

  const isControlled = value !== undefined

  const focusPill = (idx: number) => {
    if (!disabled) {
      // Focus input first, then set focus index
      inputRef.current?.focus()
      setFocusIndex(idx - selectedItemValues.length)
    }
  }

  // Handler for input wrapper click
  const handleInputWrapperClick = () => {
    if (disabled) return
    if (document.activeElement === inputRef.current) {
      setIsMenuOpen((prev) => !prev)
    }
  }

  const inputId = `${multiSelectId}-input`

  return (
    <div className="w-full">
      {label && (
        <Label htmlFor={inputId} disabled={disabled}>
          {label}
        </Label>
      )}
      <div ref={wrapperRef} className="relative">
        <InputWrapper disabled={disabled} inputRef={inputRef} size="auto" className="min-h-10">
          <div
            ref={inputWrapperRef}
            role="list"
            className={mergeClasses(
              'relative flex w-full flex-wrap items-center py-1',
              disabled ? 'text-disabled cursor-not-allowed' : 'cursor-text'
            )}
            onClick={handleInputWrapperClick}
            onMouseDown={(e) => e.preventDefault()}
          >
            {selectedItems.map((item, idx) => (
              <Pill
                key={item.value}
                id={`${multiSelectId}-pill-${idx}`}
                item={item.content}
                onMutate={onMutate}
                onValidate={onValidate}
                onValidationError={onValidationError}
                getEditableText={getEditableText}
                getReadOnlyPrefix={getReadOnlyPrefix}
                getFullText={getFullText}
                isFocused={focusIndex === idx - selectedItemValues.length}
                isEditing={editingPillIndex === idx}
                disabled={disabled}
                showEditButton={showEdit}
                onClick={() => focusPill(idx)}
                onEditButtonClick={() => setEditingPillIndex(idx)}
                onEdit={(editedPillItem) => handlePillEdit(editedPillItem, idx)}
                onRemove={() => removeItem(item.value)}
                onEditDone={handlePillEditDone}
              />
            ))}
            <span ref={sizerRef} className="invisible absolute px-1 text-sm whitespace-pre">
              {textInput}
            </span>
            <input
              value={isControlled ? value : textInput}
              ref={inputRef}
              id={inputId}
              disabled={disabled}
              className={mergeClasses('border-none bg-transparent px-1 text-sm outline-none', !showInput && 'sr-only')}
              autoComplete="off"
              onKeyDown={handleKeyDown}
              onFocus={inputFocus}
              onBlur={inputBlur}
              onPaste={inputPaste}
              onChange={handleInputChange}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={showMenu}
              aria-controls={`${multiSelectId}-listbox`}
              aria-haspopup="listbox"
              aria-disabled={disabled}
              aria-activedescendant={activeDescendantId}
              readOnly={!showInput}
            />
          </div>
        </InputWrapper>
        <DropdownMenu
          showMenu={showMenu}
          items={dropdownItems}
          multiSelect={true}
          focusedIndex={focusIndex !== null && focusIndex >= 0 ? focusIndex : -1}
          dropdownId={multiSelectId}
          onItemClick={handleDropdownItemClick}
          isItemSelected={isItemSelected}
          showSelectedIndicator={true}
          showNoItemsMessage={true}
          noItemsText={t('LabelNoItems')}
          menuMaxHeight="224px"
          className="z-60"
          triggerRef={inputWrapperRef as RefObject<HTMLElement>}
        />
      </div>
    </div>
  )
}

// Backward compatible default export for string-based usage
const MultiSelectString = MultiSelect<string>
export default MultiSelectString
