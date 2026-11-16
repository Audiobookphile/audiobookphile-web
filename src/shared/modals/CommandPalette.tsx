'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { BarChart3, Book, Headphones, Library, Radio, Rss, Search, Settings, User, Users, X } from 'lucide-react'
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
  const authors = searchResults?.authors || []
  const series = searchResults?.series || []

  const quickNavActions = [
    { type: 'action' as const, id: 'act-listening-sessions', title: 'Listening Sessions', subtitle: 'Real-time & history tracking', icon: Radio, href: '/settings/listening-sessions' },
    { type: 'action' as const, id: 'act-rss-feeds', title: 'Podcasts & OPDS Feeds', subtitle: 'Private feeds & syndication catalog', icon: Rss, href: '/settings/rss-feeds' },
    { type: 'action' as const, id: 'act-stats', title: 'Listening Statistics', subtitle: 'Habits & playback overview', icon: BarChart3, href: '/account/stats' },
    { type: 'action' as const, id: 'act-users', title: 'User Management', subtitle: 'Manage accounts & permissions', icon: Users, href: '/settings/users' },
    { type: 'action' as const, id: 'act-settings', title: t('HeaderSettings'), subtitle: 'Global server configuration', icon: Settings, href: '/settings' },
  ]

  const filteredActions = searchQuery.trim()
    ? quickNavActions.filter((a) =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : quickNavActions

  // Aggregate items for keyboard navigation
  const items = [
    ...books.map((b) => ({
      type: 'book' as const,
      id: b.libraryItem.id,
      title: b.libraryItem.media?.metadata?.title || 'Untitled',
      subtitle: b.libraryItem.media?.metadata?.authorName || '',
      item: b.libraryItem,
    })),
    ...authors.map((a) => ({
      type: 'author' as const,
      id: a.id,
      title: a.name,
      subtitle: `${a.numBooks ?? 0} books`,
      icon: User,
    })),
    ...series.map((s) => ({
      type: 'series' as const,
      id: s.series.id,
      title: s.series.name,
      subtitle: `${s.books?.length ?? 0} books`,
      icon: Library,
    })),
    ...podcasts.map((p) => ({
      type: 'podcast' as const,
      id: p.libraryItem.id,
      title: p.libraryItem.media?.metadata?.title || 'Untitled',
      subtitle: p.libraryItem.media?.metadata?.author || 'Podcast',
      item: p.libraryItem,
    })),
    ...filteredActions,
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
    if (selected.type === 'action' && 'href' in selected && selected.href) {
      router.push(selected.href)
    } else if (selected.type === 'author' && activeLibraryId) {
      router.push(`/library/${activeLibraryId}/authors/${selected.id}`)
    } else if (selected.type === 'series' && activeLibraryId) {
      router.push(`/library/${activeLibraryId}/series/${selected.id}`)
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
          className="relative mx-4 w-full max-w-2xl overflow-hidden rounded-2xl border border-white/15 bg-background/90 shadow-2xl backdrop-blur-2xl"
        >
          {/* Search Input */}
          <div className="relative flex items-center border-b border-white/10 bg-white/[0.02] px-4 py-4">
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
              className="ml-3 rounded-lg p-1 text-foreground-muted transition-colors hover:bg-white/10 hover:text-foreground"
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
                    'flex w-full cursor-pointer items-center rounded-xl px-3 py-2 text-start transition-all duration-150',
                    isActive ? 'text-foreground bg-white/10 shadow-xs' : 'text-foreground-muted hover:bg-white/5'
                  )}
                >
                  {/* Icon or Cover */}
                  <div className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/5 shadow-xs">
                    {(item.type === 'action' || item.type === 'author' || item.type === 'series') && 'icon' in item && item.icon ? (
                      <item.icon className={mergeClasses('h-5 w-5', item.type === 'action' ? 'text-primary' : 'text-accent')} />
                    ) : (item.type === 'book' || item.type === 'podcast') && 'item' in item ? (
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

                  {/* Title & Subtitle */}
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <span className="truncate font-medium">{item.title}</span>
                    {item.subtitle && (
                      <span className="truncate text-xs text-foreground-muted">{item.subtitle}</span>
                    )}
                  </div>

                  {/* Category Pill */}
                  <span className="ml-2 shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-foreground-muted uppercase">
                    {item.type}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="flex justify-between border-t border-white/10 bg-black/30 px-4 py-2.5 text-xs text-foreground-muted backdrop-blur-md">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <kbd className="rounded-md border border-white/10 bg-white/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold">↑</kbd>{' '}
                <kbd className="rounded-md border border-white/10 bg-white/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold">↓</kbd> to navigate
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded-md border border-white/10 bg-white/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold">Enter</kbd> to select
              </span>
            </div>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded-md border border-white/10 bg-white/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold">esc</kbd> to close
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
