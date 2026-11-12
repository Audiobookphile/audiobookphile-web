'use client'
import { autoUpdate, flip, offset, shift, size, useFloating } from '@floating-ui/react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useModalRef } from '@/shared/contexts/ModalContext'
import { useMenuPosition } from '@/shared/hooks/useMenuPosition'
import { useScrollToFocused } from '@/shared/hooks/useScrollToFocused'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { mergeClasses } from '@/shared/lib/merge-classes'

export interface DropdownMenuSubitem {
  text: string
  value: string | number
}

export interface DropdownMenuItem {
  text?: string // Optional only for dividers
  value?: string | number
  id?: string
  subtext?: string
  keepOpen?: boolean
  rightIcon?: React.ReactNode
  /**
   * The icon component, rendered as `<Icon size={16} className="..." />`.
   *
   * `LucideIcon` rather than a component type of our own, because that is
   * what the icon set exports and every caller passes one of them.
   */
  icon?: LucideIcon
  onClick?: () => void
  className?: string
  subitems?: DropdownMenuSubitem[]
  type?: 'item' | 'divider'
}

/**
 * Submenu component that handles viewport-aware height limiting and positioning via Portal.
 */
function DropdownSubmenu({
  subitems,
  dropdownId,
  parentIndex,
  focusedSubIndex,
  onSubitemClick,
  onMouseOver,
  onMouseLeave,
  openLeft,
  referenceElement,
  filterText,
  t,
}: {
  subitems: DropdownMenuSubitem[]
  dropdownId: string
  parentIndex: number
  focusedSubIndex: number
  onSubitemClick?: (subitem: DropdownMenuSubitem) => void
  onMouseOver: () => void
  onMouseLeave: () => void
  openLeft: boolean
  referenceElement: HTMLElement | null
  filterText: string
  t: ReturnType<typeof useTypeSafeTranslations>
}) {
  const submenuRef = useRef<HTMLUListElement>(null)

  const [scrollbarOffset, setScrollbarOffset] = useState(0)
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined)

  // Calculate scrollbar offset to prevent overlapping
  useLayoutEffect(() => {
    if (referenceElement?.parentElement) {
      const parent = referenceElement.parentElement
      const width = parent.offsetWidth - parent.clientWidth
      // Only apply offset if opening to the right and scrollbar is present
      if (width > 0 && !openLeft) {
        setScrollbarOffset(width)
      } else {
        setScrollbarOffset(0)
      }
    }
  }, [referenceElement, openLeft])

  // Floating UI setup
  const { refs, floatingStyles, isPositioned } = useFloating({
    placement: openLeft ? 'left-start' : 'right-start',
    strategy: 'fixed', // Use fixed positioning for portals to avoid stacking context issues
    middleware: [
      // mainAxis: scrollbar gap, crossAxis: -4 to align first item with parent (counteract py-1)
      offset({ mainAxis: scrollbarOffset, crossAxis: -4 }),
      // Only allow horizontal flipping (left/right), keep -start alignment so submenu always opens downward
      flip({
        fallbackPlacements: openLeft ? ['right-start'] : ['left-start'],
      }),
      shift({ padding: 10 }),
      size({
        padding: 10,
        apply({ availableHeight }) {
          setMaxHeight(availableHeight)
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
    elements: {
      reference: referenceElement,
    },
  })

  // Sync refs
  useEffect(() => {
    if (submenuRef.current) {
      refs.setFloating(submenuRef.current)
    }
  }, [refs])

  const filteredSubitems = useMemo(() => {
    if (!filterText) return subitems
    return subitems.filter((subitem) => subitem.text.toLowerCase().startsWith(filterText.toLowerCase()))
  }, [subitems, filterText])

  // Scroll focused subitem into view during keyboard navigation
  useScrollToFocused({
    containerRef: submenuRef,
    focusedIndex: focusedSubIndex,
    active: focusedSubIndex >= 0,
    getElement: useCallback(
      (container, index) => container.querySelector(`#${dropdownId}-subitem-${parentIndex}-${index}`) as HTMLElement,
      [dropdownId, parentIndex]
    ),
  })

  const submenuContent = (
    <motion.ul
      initial={{ opacity: 0, scale: 0.95, x: openLeft ? 10 : -10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      ref={submenuRef}
      role="menu"
      className="absolute z-[9999] overflow-y-auto rounded-xl border border-white/10 bg-primary/95 py-1.5 shadow-2xl backdrop-blur-xl"
      style={{
        ...floatingStyles,
        width: '200px',
        maxHeight: maxHeight ? `${maxHeight}px` : '300px',
        opacity: isPositioned ? 1 : 0,
        visibility: isPositioned ? 'visible' : 'hidden',
      }}
      onMouseOver={onMouseOver}
      onMouseLeave={onMouseLeave}
      onClick={(e) => e.stopPropagation()}
    >
      {filterText && (
        <li
          className="relative mb-1 border-b border-white/5 px-4 py-1.5 text-xs text-white/40 select-none"
          role="presentation"
        >
          <span className="font-mono tracking-wider uppercase">{filterText}</span>
        </li>
      )}
      {filteredSubitems.map((subitem, subitemIndex) => (
        <li
          key={subitem.value}
          id={`${dropdownId}-subitem-${parentIndex}-${subitemIndex}`}
          className={mergeClasses(
            'text-foreground relative mx-1 cursor-pointer rounded-lg px-4 py-2 transition-colors hover:bg-white/5',
            focusedSubIndex === subitemIndex ? 'bg-white/10' : ''
          )}
          role="option"
          tabIndex={-1}
          aria-selected={focusedSubIndex === subitemIndex}
          onClick={(e) => {
            e.stopPropagation()
            onSubitemClick?.(subitem)
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="flex items-center">
            <span className="block truncate font-sans text-sm font-medium">{subitem.text}</span>
          </div>
        </li>
      ))}
      {filteredSubitems.length === 0 && (
        <li className="relative py-3 text-white/40 select-none" role="option" aria-selected={false}>
          <div className="flex items-center justify-center">
            <span className="text-sm font-normal">{t('LabelNoItems')}</span>
          </div>
        </li>
      )}
    </motion.ul>
  )

  if (typeof document !== 'undefined') {
    return createPortal(submenuContent, document.body)
  }
  return null
}

interface DropdownMenuProps {
  showMenu: boolean
  items: DropdownMenuItem[]
  multiSelect?: boolean
  focusedIndex: number
  focusedSubIndex?: number
  openSubmenuIndex?: number | null
  dropdownId: string
  onItemClick?: (item: DropdownMenuItem) => void
  onSubitemClick?: (subitem: DropdownMenuSubitem) => void
  onOpenSubmenu?: (index: number) => void
  onCloseSubmenu?: () => void
  isItemSelected?: (item: DropdownMenuItem) => boolean
  showSelectedIndicator?: boolean
  showNoItemsMessage?: boolean
  noItemsText?: string
  menuMaxHeight?: string
  className?: string
  ref?: React.RefObject<HTMLUListElement | null>
  usePortal?: boolean
  triggerRef?: React.RefObject<HTMLElement>
  highlightSelected?: boolean
  submenuFilterText?: string
}

export default function DropdownMenu({
  showMenu,
  items,
  multiSelect = false,
  focusedIndex,
  focusedSubIndex = -1,
  openSubmenuIndex = null,
  dropdownId,
  onItemClick,
  onSubitemClick,
  onOpenSubmenu,
  onCloseSubmenu,
  isItemSelected,
  showSelectedIndicator = false,
  showNoItemsMessage = false,
  noItemsText,
  menuMaxHeight = '224px',
  className,
  ref: externalRef,
  usePortal: usePortalProp = false,
  triggerRef,
  highlightSelected = false,
  submenuFilterText = '',
}: DropdownMenuProps) {
  const t = useTypeSafeTranslations()
  const defaultNoItemsText = noItemsText || t('LabelNoItems')
  const modalRef = useModalRef()
  const portalContainerRef = modalRef || undefined
  const internalRef = useRef<HTMLUListElement>(null)
  const menuRef = externalRef || internalRef
  const [menuPosition, setMenuPosition] = useState<{ top: string; left: string; width: string }>({
    top: '0px',
    left: '0px',
    width: 'auto',
  })
  const [isMouseOver, setIsMouseOver] = useState(false)

  const [openSubmenuLeft, setOpenSubmenuLeft] = useState(false)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isOverSubmenuRef = useRef(false)
  const menuItemRefs = useRef<(HTMLLIElement | null)[]>([])
  const submenuWidth = 200

  const usePortal: boolean = (usePortalProp || modalRef !== null) && triggerRef !== undefined

  useMenuPosition({
    triggerRef: triggerRef as React.RefObject<HTMLElement>,
    menuRef: menuRef as React.RefObject<HTMLElement>,
    isOpen: showMenu,
    onPositionChange: setMenuPosition,
    disable: !usePortal,
    portalContainerRef,
  })

  useScrollToFocused({
    containerRef: menuRef,
    focusedIndex,
    active: showMenu,
    getElement: useCallback(
      (container, index) => container.querySelector(`#${dropdownId}-item-${index}`) as HTMLElement,
      [dropdownId]
    ),
  })

  useEffect(() => {
    if (showMenu && menuRef.current) {
      const boundingRect = menuRef.current.getBoundingClientRect()
      if (boundingRect) {
        setOpenSubmenuLeft(window.innerWidth - boundingRect.x < boundingRect.width + submenuWidth + 5)
      }
    } else if (!showMenu) {
      isOverSubmenuRef.current = false
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
        closeTimeoutRef.current = null
      }
    }
  }, [showMenu, menuRef])

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (!showMenu || !isMouseOver) return

    const handleGlobalWheel = (e: WheelEvent) => {
      if (menuRef?.current && menuRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement
        const submenu = target.closest('[role="menu"]')

        if (submenu && submenu !== menuRef.current) {
          e.stopPropagation()
          e.preventDefault()
          submenu.scrollTop += e.deltaY
        } else {
          e.stopPropagation()
          e.preventDefault()
          menuRef.current.scrollTop += e.deltaY
        }
      }
    }

    document.addEventListener('wheel', handleGlobalWheel, { passive: false, capture: true })
    return () => {
      document.removeEventListener('wheel', handleGlobalWheel, { capture: true })
    }
  }, [showMenu, isMouseOver, menuRef])

  const handleMouseEnter = () => setIsMouseOver(true)
  const handleMouseLeave = () => setIsMouseOver(false)
  const handleMenuMouseDown = (e: React.MouseEvent<HTMLUListElement>) => e.preventDefault()

  const handleMouseoverSubmenu = useCallback(() => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    isOverSubmenuRef.current = true
  }, [])

  const handleMouseleaveSubmenu = useCallback(() => {
    isOverSubmenuRef.current = false
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    closeTimeoutRef.current = setTimeout(() => {
      onCloseSubmenu?.()
    }, 150)
  }, [onCloseSubmenu])

  const handleMouseleaveParent = useCallback(() => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    closeTimeoutRef.current = setTimeout(() => {
      if (!isOverSubmenuRef.current) {
        onCloseSubmenu?.()
      }
    }, 150)
  }, [onCloseSubmenu])

  const handleMouseoverParent = useCallback(
    (index: number) => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
      onOpenSubmenu?.(index)
    },
    [onOpenSubmenu]
  )

  const menuItems = useMemo(
    () =>
      items.map((item, index) => {
        if (item.type === 'divider') {
          return (
            <li key={item.id || `divider-${index}`} className="mx-1 my-1 border-b border-white/5" role="presentation" />
          )
        }

        const hasSubitems = item.subitems && item.subitems.length > 0
        const isSubmenuOpen = openSubmenuIndex === index
        const Icon = item.icon

        return (
          <li
            key={item.id || item.value || index}
            id={`${dropdownId}-item-${index}`}
            ref={(el) => {
              menuItemRefs.current[index] = el
            }}
            className={mergeClasses(
              'text-foreground relative mx-1 cursor-pointer rounded-lg px-4 py-2.5 transition-colors hover:bg-white/5',
              focusedIndex === index && focusedSubIndex === -1 ? 'bg-white/10' : '',
              isSubmenuOpen ? 'bg-white/10' : '',
              highlightSelected && isItemSelected?.(item) ? 'text-primary' : '',
              item.className
            )}
            role={hasSubitems ? 'menuitem' : 'option'}
            tabIndex={-1}
            aria-selected={!hasSubitems && (isItemSelected ? isItemSelected(item) : focusedIndex === index)}
            aria-haspopup={hasSubitems ? 'menu' : undefined}
            aria-expanded={hasSubitems ? isSubmenuOpen : undefined}
            onClick={(e) => {
              e.stopPropagation()
              item.onClick?.()
              onItemClick?.(item)
            }}
            onMouseDown={(e) => e.preventDefault()}
            onMouseOver={hasSubitems ? () => handleMouseoverParent(index) : undefined}
            onMouseLeave={hasSubitems ? handleMouseleaveParent : undefined}
          >
            <div className="flex items-center gap-3">
              {Icon && <Icon size={16} className="opacity-60" />}
              <div className="flex min-w-0 flex-1 items-center">
                <span
                  className={mergeClasses(
                    'block truncate font-sans text-sm font-medium',
                    item.subtext ? 'font-semibold' : ''
                  )}
                >
                  {item.text}
                </span>
                {item.subtext && <span className="mx-1 opacity-40">:</span>}
                {item.subtext && (
                  <span className="block truncate font-sans text-xs font-normal text-foreground/60">
                    {item.subtext}
                  </span>
                )}
              </div>
            </div>
            {hasSubitems && (
              <div className="pointer-events-none absolute inset-y-0 right-2 flex h-full items-center">
                <ChevronRight size={16} className="opacity-40" />
              </div>
            )}
            {item.rightIcon && !hasSubitems && (
              <div className="pointer-events-none absolute inset-y-0 right-2 flex h-full items-center">
                {item.rightIcon}
              </div>
            )}
            {showSelectedIndicator && isItemSelected && isItemSelected(item) && !hasSubitems && (
              <span className="absolute inset-y-0 end-2 flex items-center">
                <Check size={18} className="text-primary" />
              </span>
            )}

            {hasSubitems && isSubmenuOpen && (
              <DropdownSubmenu
                subitems={item.subitems!}
                dropdownId={dropdownId}
                parentIndex={index}
                focusedSubIndex={focusedSubIndex}
                onSubitemClick={onSubitemClick}
                onMouseOver={handleMouseoverSubmenu}
                onMouseLeave={handleMouseleaveSubmenu}
                openLeft={openSubmenuLeft}
                referenceElement={menuItemRefs.current[index]}
                filterText={submenuFilterText}
                t={t}
              />
            )}
          </li>
        )
      }),
    [
      items,
      focusedIndex,
      focusedSubIndex,
      openSubmenuIndex,
      dropdownId,
      isItemSelected,
      showSelectedIndicator,
      onItemClick,
      onSubitemClick,
      highlightSelected,
      handleMouseoverParent,
      handleMouseleaveParent,
      handleMouseoverSubmenu,
      handleMouseleaveSubmenu,
      openSubmenuLeft,
      submenuFilterText,
      t,
    ]
  )

  const menuContent = (
    <AnimatePresence>
      {showMenu && (
        <motion.ul
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          ref={menuRef}
          className={mergeClasses(
            'bg-primary/95 absolute z-10 mt-1.5 overflow-auto rounded-xl border border-white/10 py-1.5 shadow-2xl ring-1 ring-black/10 backdrop-blur-xl',
            className
          )}
          role="listbox"
          id={`${dropdownId}-listbox`}
          tabIndex={-1}
          style={{
            maxHeight: `min(${menuMaxHeight}, calc(100vh - 100px))`,
            ...(usePortal
              ? {
                  position: 'absolute',
                  top: menuPosition.top,
                  left: menuPosition.left,
                  minWidth: `max(220px, ${menuPosition.width})`,
                  width: 'max-content',
                  zIndex: 9999,
                }
              : {}),
          }}
          aria-multiselectable={multiSelect}
          aria-activedescendant={
            focusedSubIndex !== -1 && openSubmenuIndex !== null
              ? `${dropdownId}-subitem-${openSubmenuIndex}-${focusedSubIndex}`
              : `${dropdownId}-item-${focusedIndex}`
          }
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseDown={handleMenuMouseDown}
          onClick={(e) => e.stopPropagation()}
        >
          {menuItems}
          {showNoItemsMessage && !items.length && (
            <li
              className="relative px-4 py-4 text-foreground select-none"
              role="option"
              aria-selected={false}
              cy-id="dropdown-menu-no-items"
            >
              <div className="flex items-center justify-center">
                <span className="font-normal opacity-40">{defaultNoItemsText}</span>
              </div>
            </li>
          )}
        </motion.ul>
      )}
    </AnimatePresence>
  )

  if (usePortal && typeof document !== 'undefined') {
    const portalTarget = portalContainerRef?.current || document.body
    return createPortal(menuContent, portalTarget)
  }

  return menuContent
}
