'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Book, Headphones, Search, Settings, X } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useLibraryOptional } from '@/features/library/contexts/LibraryContext'
import { useLibrarySearch } from '@/features/library/hooks/useLibrarySearch'
import { useCommandPalette } from '@/shared/contexts/CommandPaletteContext'
import { useUser } from '@/shared/contexts/UserContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { getLibraryItemCoverUrl } from '@/shared/lib/coverUtils'
import { mergeClasses } from '@/shared/lib/merge-classes'

export default function CommandPalette() {
  const { isOpen, setIsOpen } = useCommandPalette()
  const libraryContext = useLibraryOptional()
  const { user } = useUser()
  const router = useRouter()
  const t = useTypeSafeTranslations()

  const activeLibraryId = libraryContext?.library?.id || user?.defaultLibraryId

  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    handleSearch,
    useSemanticSearch,
    setUseSemanticSearch,
  } = useLibrarySearch({
    libraryId: activeLibraryId || undefined,
    autoSelectFirst: false,
  })

  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      void handleSearch()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, handleSearch])

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, setSearchQuery])

  const books = searchResults?.book || []
  const podcasts = searchResults?.podcast || []

  // Aggregate items for keyboard navigation
  const items = [
    ...books.map((b) => ({
      type: 'book' as const,
      id: b.libraryItem.id,
      title: b.libraryItem.media?.metadata?.title,
      item: b.libraryItem,
    })),
    ...podcasts.map((p) => ({
      type: 'podcast' as const,
      id: p.libraryItem.id,
      title: p.libraryItem.media?.metadata?.title,
      item: p.libraryItem,
    })),
    { type: 'action' as const, id: 'settings', title: t('HeaderSettings'), icon: Settings, href: '/settings' },
  ]

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((prev) => (prev < items.length - 1 ? prev + 1 : prev))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = items[activeIndex]
        if (selected) {
          executeAction(selected)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, items, activeIndex, setIsOpen])

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[activeIndex] as HTMLElement
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [activeIndex])

  const executeAction = (selected: (typeof items)[number]) => {
    setIsOpen(false)
    if (selected.type === 'action' && selected.href) {
      router.push(selected.href)
    } else if ((selected.type === 'book' || selected.type === 'podcast') && activeLibraryId) {
      router.push(`/library/${activeLibraryId}/item/${selected.id}`)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] sm:pt-[20vh]">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative mx-4 w-full max-w-2xl overflow-hidden rounded-xl border border-white/10 bg-primary shadow-2xl"
        >
          {/* Search Input */}
          <div className="relative flex items-center border-b border-white/10 px-4 py-4">
            <Search className="mr-3 h-5 w-5 text-foreground-muted" />
            <input
              ref={inputRef}
              className="flex-1 bg-transparent text-lg text-foreground outline-none placeholder:text-foreground-muted"
              placeholder={useSemanticSearch ? "Describe what you're looking for..." : t('PlaceholderSearch') + '...'}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setActiveIndex(0)
              }}
            />
            {isSearching && (
              <div className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            )}

            {/* Semantic Search Toggle */}
            <button
              onClick={() => {
                setUseSemanticSearch(!useSemanticSearch)
                if (searchQuery) void handleSearch()
              }}
              className={mergeClasses(
                'mr-3 flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                useSemanticSearch
                  ? 'bg-primary-500/20 text-primary-400 border-primary-500/50'
                  : 'text-foreground-muted hover:text-foreground border-white/10 bg-white/5 hover:bg-white/10'
              )}
              title="Toggle AI Semantic Search"
            >
              <span className="relative flex h-2 w-2">
                {useSemanticSearch && (
                  <span className="bg-primary-400 absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
                )}
                <span
                  className={mergeClasses(
                    'relative inline-flex h-2 w-2 rounded-full',
                    useSemanticSearch ? 'bg-primary-500' : 'bg-foreground-muted'
                  )}
                ></span>
              </span>
              AI Search
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="ml-3 rounded-md p-1 text-foreground-muted transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Results Area */}
          <div
            ref={listRef}
            className="max-h-[60vh] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent overflow-y-auto p-2"
          >
            {items.length === 0 && searchQuery.length > 0 && !isSearching && (
              <div className="py-14 text-center text-sm text-foreground-muted">{t('MessageNoItems')}</div>
            )}

            {items.map((item, index) => {
              const isActive = index === activeIndex

              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => executeAction(item)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={mergeClasses(
                    'flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-start transition-colors',
                    isActive ? 'text-foreground bg-white/10' : 'text-foreground-muted hover:bg-white/5'
                  )}
                >
                  {/* Icon or Cover */}
                  <div className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-white/5">
                    {item.type === 'action' && item.icon ? (
                      <item.icon className="h-5 w-5" />
                    ) : item.type === 'book' || item.type === 'podcast' ? (
                      <Image
                        src={getLibraryItemCoverUrl(item.id, item.item.updatedAt)}
                        alt={item.title || ''}
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : null}
                  </div>

                  {/* Title & Type */}
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate font-medium">{item.title}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-xs opacity-70">
                      {item.type === 'book' && <Book size={10} />}
                      {item.type === 'podcast' && <Headphones size={10} />}
                      {item.type === 'action' && 'Action'}
                      {item.type !== 'action' && item.type}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="flex justify-between border-t border-white/10 bg-black/20 px-4 py-2 text-xs text-foreground-muted">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-white/10 px-1.5 font-sans font-semibold">↑</kbd>{' '}
                <kbd className="rounded bg-white/10 px-1.5 font-sans font-semibold">↓</kbd> to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-white/10 px-1.5 font-sans font-semibold">Enter</kbd> to select
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-white/10 px-1.5 font-sans font-semibold">esc</kbd> to close
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
