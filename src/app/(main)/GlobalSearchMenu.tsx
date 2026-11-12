import { AnimatePresence, motion } from 'framer-motion'
import { Book, Bookmark, ChevronRight, Layers, Mic, Music, Radio, Search, Tag, User as UserIcon } from 'lucide-react'
import Link from 'next/link'
import React, { useCallback, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { FlatResultItem, SearchResultType } from '@/features/library/hooks/useGlobalSearchTransformer'
import AuthorImage from '@/features/metadata/components/AuthorImage'
import type { Author } from '@/types/api'
import { useMenuPosition } from '@/shared/hooks/useMenuPosition'
import { useScrollToFocused } from '@/shared/hooks/useScrollToFocused'
import { mergeClasses } from '@/shared/lib/merge-classes'

const HighlightMatch = ({ text, query }: { text: string; query: string }) => {
  const parts = useMemo(() => {
    if (!query) return [{ text, isMatch: false }]
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(${escapedQuery})`, 'gi')
    return text.split(regex).map((part) => ({
      text: part,
      isMatch: part.toLowerCase() === query.toLowerCase(),
    }))
  }, [text, query])

  return (
    <>
      {parts.map((part, i) =>
        part.isMatch ? (
          <span key={i} className="font-black text-accent drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">
            {part.text}
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  )
}

const getLucideIcon = (type: SearchResultType) => {
  switch (type) {
    case 'tag':
      return Tag
    case 'genre':
      return Layers
    case 'collection':
      return Bookmark
    case 'playlist':
      return Music
    case 'author':
      return UserIcon
    case 'book':
      return Book
    case 'podcast':
      return Mic
    case 'episode':
      return Radio
    default:
      return Search
  }
}

interface GlobalSearchMenuProps {
  results: FlatResultItem[]
  focusedIndex: number
  onItemClick: () => void
  menuRef: React.RefObject<HTMLDivElement | null>
  searchQuery: string
  /** Optional callback for when an item is selected. If provided, items become buttons instead of links. */
  onItemSelect?: (item: FlatResultItem) => void
  /** Use portal to render the menu. Useful for avoiding clipping issues. */
  usePortal?: boolean
  /** Ref to the input/trigger element, required for portal positioning */
  triggerRef?: React.RefObject<HTMLElement | null>
}

export default function GlobalSearchMenu({
  results,
  focusedIndex,
  onItemClick,
  menuRef,
  searchQuery,
  onItemSelect,
  usePortal = false,
  triggerRef,
}: GlobalSearchMenuProps) {
  const [menuPosition, setMenuPosition] = useState({ top: '0px', left: '0px', width: 'auto' })

  useMenuPosition({
    triggerRef: triggerRef as React.RefObject<HTMLElement>,
    menuRef: menuRef as React.RefObject<HTMLElement>,
    isOpen: true,
    onPositionChange: setMenuPosition,
    disable: !usePortal,
  })

  useScrollToFocused({
    containerRef: menuRef,
    focusedIndex,
    getElement: useCallback(
      (container, index) => container.querySelector(`[data-index="${index}"]`) as HTMLElement,
      []
    ),
  })

  const menuContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        ref={menuRef}
        cy-id="global-search-menu"
        role="listbox"
        tabIndex={-1}
        className="globalSearchMenu absolute z-50 mt-2 max-h-[min(600px,calc(100vh-100px))] w-full overflow-y-auto rounded-2xl border border-white/10 bg-primary/95 p-1.5 shadow-2xl backdrop-blur-xl"
        style={
          usePortal
            ? {
                position: 'absolute',
                top: menuPosition.top,
                left: menuPosition.left,
                width: menuPosition.width,
                zIndex: 9999,
              }
            : {}
        }
        onMouseDown={(e) => e.preventDefault()}
      >
        {(Array.isArray(results) ? results : []).map((result, index) => {
          if (result.isPlaceholder) {
            return (
              <div key={result.id} className="px-4 py-3 text-sm font-medium text-foreground/40 italic">
                {result.placeholderText}
              </div>
            )
          }

          if (result.type === 'header') {
            return (
              <div
                key={result.id}
                className="mt-3 mb-1 px-4 py-1 text-[10px] font-black tracking-[0.15em] text-foreground/30 uppercase"
              >
                {result.title}
              </div>
            )
          }

          const isSelected = focusedIndex === index
          const isAuthor = result.type === 'author'
          const Icon = getLucideIcon(result.type)
          const shouldHighlightSubtitle =
            result.type === 'book' || result.type === 'podcast' || result.type === 'episode'
          const containerClass = isAuthor ? 'w-9 h-14' : 'w-11 h-11'
          const hasImage = !!result.imageSrc || isAuthor

          const itemContent = (
            <div className="flex items-center gap-3.5">
              {/* Image / Icon */}
              <div
                className={mergeClasses(
                  'relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5 shadow-inner ring-1 ring-white/5',
                  containerClass
                )}
              >
                {hasImage ? (
                  result.type === 'author' && result.originalItem ? (
                    <AuthorImage author={result.originalItem as unknown as Author} className="h-full w-full" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={result.imageSrc} alt="" className="h-full w-full object-cover" loading="lazy" />
                  )
                ) : (
                  <Icon size={18} className="text-foreground/20" />
                )}
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1 py-1">
                <div className="truncate text-sm font-bold tracking-tight text-foreground">
                  <HighlightMatch text={result.title} query={searchQuery} />
                </div>
                {result.subtitle && (
                  <div className="mt-0.5 truncate text-[10px] font-medium text-foreground/40">
                    {shouldHighlightSubtitle ? (
                      <HighlightMatch text={result.subtitle} query={searchQuery} />
                    ) : (
                      <span>{result.subtitle}</span>
                    )}
                  </div>
                )}
                {result.author && (
                  <div className="mt-0.5 truncate text-xs font-semibold text-foreground/60">
                    <HighlightMatch text={result.author} query={searchQuery} />
                  </div>
                )}
              </div>

              {isSelected && (
                <div className="pr-2 text-accent">
                  <ChevronRight size={16} strokeWidth={3} />
                </div>
              )}
            </div>
          )

          const itemKey = `${result.type}-${result.id}`
          const commonProps = {
            id: `result-item-${index}`,
            'data-index': index,
            tabIndex: -1,
            className: mergeClasses(
              'block px-2 py-2 cursor-pointer no-underline select-none rounded-xl transition-all duration-200',
              'hover:bg-white/5',
              isSelected ? 'bg-white/10 shadow-sm' : ''
            ),
            role: 'option' as const,
            'aria-selected': isSelected,
          }

          if (onItemSelect) {
            return (
              <div
                key={itemKey}
                {...commonProps}
                onClick={() => {
                  onItemSelect(result)
                  onItemClick()
                }}
              >
                {itemContent}
              </div>
            )
          }

          return (
            <Link key={itemKey} prefetch={true} {...commonProps} href={result.link || '#'} onClick={onItemClick}>
              {itemContent}
            </Link>
          )
        })}
      </motion.div>
    </AnimatePresence>
  )

  if (usePortal && typeof document !== 'undefined') {
    const portalTarget = document.body
    return createPortal(menuContent, portalTarget)
  }

  return menuContent
}
