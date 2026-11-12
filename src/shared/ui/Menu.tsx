'use client'

import { useCallback, useId, useRef, useState } from 'react'
import { useClickOutside } from '@/shared/hooks/useClickOutside'
import { mergeClasses } from '@/shared/lib/merge-classes'
import DropdownMenu, { DropdownMenuItem, DropdownMenuSubitem } from './DropdownMenu'

interface MenuProps {
  items: DropdownMenuItem[]
  trigger: (isOpen: boolean) => React.ReactNode
  onItemClick?: (item: DropdownMenuItem) => void
  onSubitemClick?: (subitem: DropdownMenuSubitem) => void
  className?: string
  menuMaxHeight?: string
  usePortal?: boolean
  highlightSelected?: boolean
  isItemSelected?: (item: DropdownMenuItem) => boolean
}

export default function Menu({
  items,
  trigger,
  onItemClick,
  onSubitemClick,
  className,
  menuMaxHeight = '400px',
  usePortal = true,
  highlightSelected = false,
  isItemSelected,
}: MenuProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [focusedSubIndex, setFocusedSubIndex] = useState(-1)
  const [openSubmenuIndex, setOpenSubmenuIndex] = useState<number | null>(null)

  const triggerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const id = useId()

  const closeMenu = useCallback(() => {
    setShowMenu(false)
    setFocusedIndex(-1)
    setFocusedSubIndex(-1)
    setOpenSubmenuIndex(null)
  }, [])

  useClickOutside(menuRef, triggerRef, closeMenu)

  const toggleMenu = () => {
    setShowMenu((prev) => !prev)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!showMenu) {
        setShowMenu(true)
        setFocusedIndex(0)
      } else {
        setFocusedIndex((prev) => (prev < items.length - 1 ? prev + 1 : prev))
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!showMenu) {
        setShowMenu(true)
        setFocusedIndex(items.length - 1)
      } else {
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev))
      }
    } else if (e.key === 'Escape') {
      closeMenu()
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (!showMenu) {
        setShowMenu(true)
        setFocusedIndex(0)
      } else if (focusedIndex >= 0) {
        const item = items[focusedIndex]
        if (item.type !== 'divider') {
          item.onClick?.()
          onItemClick?.(item)
          if (!item.keepOpen) closeMenu()
        }
      }
    }
  }

  return (
    <div className={mergeClasses('relative w-fit', className)}>
      <div
        ref={triggerRef}
        onClick={toggleMenu}
        onKeyDown={handleKeyDown}
        className="cursor-pointer"
        role="button"
        tabIndex={-1}
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={showMenu}
      >
        {trigger(showMenu)}
      </div>

      <DropdownMenu
        showMenu={showMenu}
        items={items}
        focusedIndex={focusedIndex}
        focusedSubIndex={focusedSubIndex}
        openSubmenuIndex={openSubmenuIndex}
        dropdownId={id}
        onItemClick={(item) => {
          if (item.type !== 'divider') {
            onItemClick?.(item)
            if (!item.keepOpen) closeMenu()
          }
        }}
        onSubitemClick={(subitem) => {
          onSubitemClick?.(subitem)
          closeMenu()
        }}
        onOpenSubmenu={setOpenSubmenuIndex}
        onCloseSubmenu={() => setOpenSubmenuIndex(null)}
        menuMaxHeight={menuMaxHeight}
        usePortal={usePortal}
        triggerRef={triggerRef as React.RefObject<HTMLElement>}
        highlightSelected={highlightSelected}
        isItemSelected={isItemSelected}
        ref={menuRef}
      />
    </div>
  )
}
