'use client'
import { ChevronDown } from 'lucide-react'
import { useCallback, useId, useMemo, useRef, useState } from 'react'
import { useClickOutside } from '@/shared/hooks/useClickOutside'
import { mergeClasses } from '@/shared/lib/merge-classes'
import DropdownMenu, { DropdownMenuItem } from './DropdownMenu'
import InputWrapper from './InputWrapper'
import Label from './Label'

export interface DropdownSubitem {
  text: string
  value: string | number
}

export interface DropdownItem {
  text: string
  value: string | number
  subtext?: string
  keepOpen?: boolean
  rightIcon?: React.ReactNode
  disabled?: boolean
  subitems?: DropdownSubitem[]
}

interface DropdownProps {
  value?: string | number
  label?: string
  items?: DropdownItem[]
  disabled?: boolean
  size?: 'small' | 'medium' | 'large' | 'auto'
  menuMaxHeight?: string
  onChange?: (value: string | number) => void
  className?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  highlightSelected?: boolean
  displayText?: string
  usePortal?: boolean
}

export default function Dropdown({
  value,
  label = '',
  items = [],
  disabled = false,
  size = 'medium',
  menuMaxHeight = '224px',
  onChange,
  className,
  leftIcon,
  rightIcon,
  highlightSelected = false,
  displayText,
  usePortal = false,
}: DropdownProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [focusedSubIndex, setFocusedSubIndex] = useState(-1)
  const [openSubmenuIndex, setOpenSubmenuIndex] = useState<number | null>(null)
  const [submenuFilterText, setSubmenuFilterText] = useState('')
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)

  const dropdownId = useId()

  const openMenu = (index: number = 0) => {
    setShowMenu(true)
    setFocusedIndex(index)
    setFocusedSubIndex(-1)
    setOpenSubmenuIndex(null)
  }

  const closeMenu = useCallback(() => {
    setShowMenu(false)
    setFocusedIndex(-1)
    setFocusedSubIndex(-1)
    setOpenSubmenuIndex(null)
  }, [])

  useClickOutside(menuRef, buttonRef, closeMenu)

  const toggleMenu = () => {
    if (disabled) return
    if (showMenu) {
      closeMenu()
    } else {
      openMenu()
    }
  }

  const openSubMenu = (index: number) => {
    const currentItem = items[index]
    setOpenSubmenuIndex(index)
    if (currentItem?.subitems && currentItem.subitems.length > 0) {
      setFocusedSubIndex(0)
    } else {
      setFocusedSubIndex(-1)
    }
  }

  const closeSubMenu = () => {
    setOpenSubmenuIndex(null)
    setFocusedSubIndex(-1)
    setSubmenuFilterText('')
  }

  const handleOptionClick = (itemValue: string | number) => {
    onChange?.(itemValue)

    const clickedItem = items.find((i) => (typeof i === 'object' ? i.value === itemValue : i === itemValue))
    if (typeof clickedItem === 'object' && clickedItem.keepOpen) {
      return
    }

    closeMenu()
  }

  const handleSubitemClick = (subitemValue: string | number) => {
    onChange?.(subitemValue)
    closeMenu()
  }

  const itemsToShow = useMemo(
    () =>
      items.map((item) => {
        if (typeof item === 'string' || typeof item === 'number') {
          return {
            text: String(item),
            value: item,
          }
        }
        return item
      }),
    [items]
  )

  const selectedItem = itemsToShow.find((item) => item.value === value)
  const selectedText = displayText || selectedItem?.text || ''
  const selectedSubtext = displayText ? '' : selectedItem?.subtext || ''

  let longLabel = ''
  if (label) longLabel += label + ': '
  if (selectedText) longLabel += selectedText
  if (selectedSubtext) longLabel += ' ' + selectedSubtext

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleMenu()
  }

  const getFilteredSubitems = useCallback(() => {
    if (openSubmenuIndex === null) return []
    const currentItem = items[openSubmenuIndex]
    if (!currentItem?.subitems) return []
    if (!submenuFilterText) return currentItem.subitems
    return currentItem.subitems.filter((subitem) =>
      subitem.text.toLowerCase().startsWith(submenuFilterText.toLowerCase())
    )
  }, [items, openSubmenuIndex, submenuFilterText])

  const handleVerticalNavigation = (direction: 'up' | 'down') => {
    if (direction === 'down') {
      if (!showMenu) {
        openMenu()
      } else if (focusedSubIndex !== -1 && openSubmenuIndex !== null) {
        const filteredSubitems = getFilteredSubitems()
        if (filteredSubitems.length > 0) {
          setFocusedSubIndex((prev) => (prev < filteredSubitems.length - 1 ? prev + 1 : prev))
        }
      } else {
        closeSubMenu()
        setFocusedIndex((prev) => (prev < itemsToShow.length - 1 ? prev + 1 : prev))
      }
    } else {
      if (!showMenu) {
        openMenu(itemsToShow.length - 1)
      } else if (focusedSubIndex !== -1 && openSubmenuIndex !== null) {
        const filteredSubitems = getFilteredSubitems()
        if (filteredSubitems.length > 0) {
          setFocusedSubIndex((prev) => (prev > 0 ? prev - 1 : prev))
        }
      } else {
        closeSubMenu()
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev))
      }
    }
  }

  const handleHorizontalNavigation = (direction: 'left' | 'right') => {
    if (direction === 'right') {
      if (showMenu && focusedSubIndex === -1 && focusedIndex >= 0) {
        const currentItem = items[focusedIndex]
        if (currentItem?.subitems) {
          openSubMenu(focusedIndex)
        }
      }
    } else {
      if (showMenu && openSubmenuIndex !== null) {
        closeSubMenu()
      }
    }
  }

  const handleEnterSpace = () => {
    if (!showMenu) {
      openMenu()
    } else if (focusedSubIndex !== -1 && focusedSubIndex >= 0 && openSubmenuIndex !== null) {
      const filteredSubitems = getFilteredSubitems()
      if (filteredSubitems.length > 0 && focusedSubIndex < filteredSubitems.length) {
        const subitem = filteredSubitems[focusedSubIndex]
        if (subitem) {
          handleSubitemClick(subitem.value)
        }
      }
    } else if (focusedIndex >= 0 && focusedIndex < itemsToShow.length) {
      const currentItem = items[focusedIndex]
      if (currentItem?.subitems) {
        if (openSubmenuIndex === focusedIndex) {
          closeSubMenu()
        } else {
          openSubMenu(focusedIndex)
        }
      } else {
        handleOptionClick(itemsToShow[focusedIndex].value)
      }
    }
  }

  const handleEscape = () => {
    if (openSubmenuIndex !== null) {
      closeSubMenu()
    } else {
      closeMenu()
      buttonRef.current?.focus()
    }
  }

  const handleHomeEnd = (key: 'home' | 'end') => {
    if (showMenu) {
      if (key === 'home') {
        if (focusedSubIndex !== -1) {
          setFocusedSubIndex(0)
        } else {
          closeSubMenu()
          setFocusedIndex(0)
        }
      } else {
        if (focusedSubIndex !== -1 && openSubmenuIndex !== null) {
          const filteredSubitems = getFilteredSubitems()
          if (filteredSubitems.length > 0) {
            setFocusedSubIndex(filteredSubitems.length - 1)
          }
        } else {
          closeSubMenu()
          setFocusedIndex(itemsToShow.length - 1)
        }
      }
    }
  }

  const handleTab = () => {
    if (showMenu) {
      closeMenu()
    }
  }

  const handleTypeToFilter = (key: string) => {
    if (openSubmenuIndex !== null) {
      setSubmenuFilterText((prev) => prev + key.toLowerCase())
      setFocusedSubIndex(0)
    }
  }

  const handleBackspace = () => {
    if (openSubmenuIndex !== null && submenuFilterText.length > 0) {
      setSubmenuFilterText((prev) => prev.slice(0, -1))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        handleVerticalNavigation('down')
        break

      case 'ArrowUp':
        e.preventDefault()
        handleVerticalNavigation('up')
        break

      case 'ArrowRight':
        e.preventDefault()
        handleHorizontalNavigation('right')
        break

      case 'ArrowLeft':
        e.preventDefault()
        handleHorizontalNavigation('left')
        break

      case 'Enter':
      case ' ':
        e.preventDefault()
        handleEnterSpace()
        break

      case 'Escape':
        e.preventDefault()
        handleEscape()
        break

      case 'Home':
        e.preventDefault()
        handleHomeEnd('home')
        break

      case 'End':
        e.preventDefault()
        handleHomeEnd('end')
        break

      case 'Tab':
        handleTab()
        break

      case 'Backspace':
        e.preventDefault()
        handleBackspace()
        break

      default:
        if (e.key.length === 1 && /[\p{L}\p{N}]/u.test(e.key)) {
          e.preventDefault()
          handleTypeToFilter(e.key)
        }
        break
    }
  }

  const dropdownMenuItems: DropdownMenuItem[] = itemsToShow.map((item) => ({
    text: item.text,
    value: item.value,
    subtext: item.subtext,
    keepOpen: item.keepOpen,
    rightIcon: item.rightIcon,
    subitems: item.subitems?.map((sub) => ({
      text: sub.text,
      value: sub.value,
    })),
  }))

  const dropdownButtonId = `${dropdownId}-button`

  return (
    <div className={mergeClasses('relative w-full', className)}>
      {label && (
        <Label htmlFor={dropdownButtonId} disabled={disabled}>
          {label}
        </Label>
      )}

      <InputWrapper disabled={disabled} size={size} inputRef={buttonRef}>
        <button
          ref={buttonRef}
          id={dropdownButtonId}
          type="button"
          role="combobox"
          aria-label={longLabel}
          disabled={disabled}
          className={mergeClasses(
            'text-foreground relative w-full cursor-pointer text-left',
            'flex h-full items-center justify-between border-none bg-transparent ps-2 outline-none',
            'disabled:text-disabled group transition-all disabled:cursor-not-allowed',
            size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : size === 'medium' ? 'text-base' : ''
          )}
          aria-haspopup="listbox"
          aria-expanded={showMenu}
          aria-activedescendant={
            focusedSubIndex !== -1 && openSubmenuIndex !== null
              ? `${dropdownId}-subitem-${openSubmenuIndex}-${focusedSubIndex}`
              : focusedIndex >= 0
                ? `${dropdownId}-item-${focusedIndex}`
                : undefined
          }
          aria-controls={`${dropdownId}-listbox`}
          onClick={handleButtonClick}
          onKeyDown={handleKeyDown}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            <span className={mergeClasses('block truncate font-sans font-medium', selectedSubtext ? 'opacity-90' : '')}>
              {selectedText}
            </span>
            {selectedSubtext && <span className="opacity-40">/</span>}
            {selectedSubtext && (
              <span className="block truncate font-sans text-xs font-normal opacity-60">{selectedSubtext}</span>
            )}
          </span>
          <span className="pointer-events-none ms-3 flex flex-shrink-0 items-center pe-1">
            {rightIcon || (
              <ChevronDown
                size={18}
                className={mergeClasses('transition-transform duration-200', showMenu ? 'rotate-180' : '')}
              />
            )}
          </span>
        </button>
      </InputWrapper>

      <DropdownMenu
        showMenu={showMenu}
        items={dropdownMenuItems}
        focusedIndex={focusedIndex}
        focusedSubIndex={focusedSubIndex}
        openSubmenuIndex={openSubmenuIndex}
        dropdownId={dropdownId}
        onItemClick={(item) => {
          if (item.subitems && item.subitems.length > 0) {
            const idx = dropdownMenuItems.findIndex((i) => i.value === item.value)
            if (idx >= 0) {
              if (openSubmenuIndex === idx) {
                closeSubMenu()
              } else {
                openSubMenu(idx)
              }
            }
          } else {
            handleOptionClick(item.value as string | number)
          }
        }}
        onSubitemClick={(subitem) => handleSubitemClick(subitem.value)}
        onOpenSubmenu={(index) => {
          if (openSubmenuIndex !== index) {
            setOpenSubmenuIndex(index)
            setSubmenuFilterText('')
          }
        }}
        onCloseSubmenu={() => {
          setOpenSubmenuIndex(null)
          setSubmenuFilterText('')
        }}
        submenuFilterText={submenuFilterText}
        menuMaxHeight={menuMaxHeight}
        showNoItemsMessage={false}
        ref={menuRef}
        highlightSelected={highlightSelected}
        isItemSelected={(item) => item.value === value}
        usePortal={usePortal}
        triggerRef={buttonRef as React.RefObject<HTMLElement>}
      />
    </div>
  )
}
