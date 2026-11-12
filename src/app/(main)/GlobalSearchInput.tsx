'use client'
import { Search, Sparkles, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FlatResultItem, useGlobalSearchTransformer } from '@/features/library/hooks/useGlobalSearchTransformer'
import { useLibrarySearch } from '@/features/library/hooks/useLibrarySearch'
import { useClickOutside } from '@/shared/hooks/useClickOutside'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import InputWrapper from '@/shared/ui/InputWrapper'
import LoadingSpinner from '@/shared/widgets/LoadingSpinner'
import GlobalSearchMenu from './GlobalSearchMenu'

interface GlobalSearchInputProps {
  libraryId?: string
  autoFocus?: boolean
  onSubmit?: () => void
  /** Optional callback for when an item is selected. If provided, items become selectable instead of navigating. */
  onItemSelect?: (item: FlatResultItem) => void
  /** Optional callback for when the search is cleared. */
  onClear?: () => void
  /** Use portal to render the dropdown menu. Useful for avoiding clipping issues. */
  usePortal?: boolean
}

export default function GlobalSearchInput({
  libraryId,
  autoFocus,
  onSubmit,
  onItemSelect,
  onClear,
  usePortal = false,
}: GlobalSearchInputProps = {}) {
  const searchOptions = useMemo(() => ({ autoSelectFirst: false, libraryId }), [libraryId])
  const {
    searchQuery,
    setSearchQuery,
    isSearching,
    searchResults,
    selectedLibraryId,
    handleSearch,
    searchError,
    clearSelection,
    useSemanticSearch,
    setUseSemanticSearch,
  } = useLibrarySearch(searchOptions)
  const t = useTypeSafeTranslations()
  const router = useRouter()

  // Local state for UI
  const [showMenu, setShowMenu] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [isTyping, setIsTyping] = useState(false) // Local typing state for "Thinking..."

  // Debounce search
  useEffect(() => {
    if (!searchQuery) {
      setIsTyping(false)
      return
    }

    setIsTyping(true)
    const timeoutId = setTimeout(() => {
      setIsTyping(false)
      void handleSearch()
    }, 500) // 500ms debounce

    return () => clearTimeout(timeoutId)
  }, [searchQuery, handleSearch])

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useClickOutside(menuRef, containerRef, () => {
    setShowMenu(false)
  })

  const handleInputFocus = () => {
    setShowMenu(true)
  }

  const handleInputBlur = () => {
    setShowMenu(false)
  }

  const flatResults = useGlobalSearchTransformer({
    searchResults,
    searchQuery,
    isSearching,
    isTyping,
    searchError,
    selectedLibraryId,
  })

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      // Skip headers
      let nextIndex = focusedIndex + 1
      while (
        nextIndex < flatResults.length &&
        (flatResults[nextIndex].type === 'header' || flatResults[nextIndex].isPlaceholder)
      ) {
        nextIndex++
      }
      if (nextIndex < flatResults.length) {
        setFocusedIndex(nextIndex)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      let prevIndex = focusedIndex - 1
      while (prevIndex >= 0 && (flatResults[prevIndex].type === 'header' || flatResults[prevIndex].isPlaceholder)) {
        prevIndex--
      }
      if (prevIndex >= 0) {
        setFocusedIndex(prevIndex)
      } else if (prevIndex < 0) {
        setFocusedIndex(-1) // Allow going back to input
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (focusedIndex >= 0 && flatResults[focusedIndex]) {
        const item = flatResults[focusedIndex]
        // If onItemSelect is provided, use it for selection
        if (onItemSelect) {
          onItemSelect(item)
          clearSelection()
          setShowMenu(false)
          inputRef.current?.blur()
          onSubmit?.()
        } else if (item.link) {
          // Otherwise navigate to the item link
          router.push(item.link)
          clearSelection()
          setShowMenu(false)
          inputRef.current?.blur()
          onSubmit?.()
        }
      } else if (searchQuery.trim() && !onItemSelect) {
        // Only navigate to search results if not in selection mode
        router.push(`/library/${selectedLibraryId}/search?q=${encodeURIComponent(searchQuery.trim())}`)
        clearSelection()
        setShowMenu(false)
        inputRef.current?.blur()
        onSubmit?.()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setShowMenu(false)
      inputRef.current?.blur()
    }
  }

  const handleClear = () => {
    clearSelection()
    setFocusedIndex(-1)
    inputRef.current?.focus()
    onClear?.()
  }

  const handleResultClick = () => {
    clearSelection()
    setShowMenu(false)
    setFocusedIndex(-1)
    inputRef.current?.blur()
    onSubmit?.()
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <InputWrapper
        size="small"
        className="w-full border-white/10 bg-white/5 transition-all duration-300 group-focus-within:border-primary/50 group-focus-within:bg-white/10"
        inputRef={inputRef}
      >
        <input
          ref={inputRef}
          type="text"
          className="h-full w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-foreground/30"
          placeholder={t('PlaceholderSearch')}
          value={searchQuery}
          onInput={(e) => setSearchQuery(e.currentTarget.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-label={t('ButtonSearch')}
          aria-expanded={showMenu}
          aria-haspopup="listbox"
          aria-controls="global-search-menu"
          aria-activedescendant={focusedIndex >= 0 ? `result-item-${focusedIndex}` : undefined}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          autoFocus={autoFocus}
        />
      </InputWrapper>

      {/* Search Icon, Spinner or Clear Button */}
      <div className="absolute end-0 top-0 flex h-full items-center gap-1 pe-2">
        <button
          type="button"
          onClick={() => setUseSemanticSearch(!useSemanticSearch)}
          className={`flex items-center justify-center rounded-md p-1.5 transition-all duration-300 ${
            useSemanticSearch
              ? 'bg-accent/20 text-accent shadow-[0_0_10px_rgba(var(--accent),0.3)]'
              : 'text-foreground/30 hover:bg-white/5 hover:text-foreground/70'
          }`}
          aria-label="Toggle Smart AI Search"
          title="Toggle Smart AI Search"
        >
          <Sparkles size={16} strokeWidth={useSemanticSearch ? 2.5 : 2} />
        </button>

        {isSearching || isTyping ? (
          <LoadingSpinner size="la-sm" className="scale-75 text-primary opacity-80" />
        ) : searchQuery ? (
          <button
            onClick={handleClear}
            className="cursor-pointer rounded-md p-1.5 text-foreground/40 transition-all hover:bg-white/10 hover:text-foreground"
            aria-label="Clear search"
          >
            <X size={16} strokeWidth={3} aria-hidden="true" />
          </button>
        ) : (
          <div className="p-1.5">
            <Search
              size={16}
              strokeWidth={2.5}
              className="pointer-events-none text-foreground/30 transition-colors duration-300 group-focus-within:text-primary"
              aria-hidden="true"
            />
          </div>
        )}
      </div>

      {/* Dropdown Menu */}
      {showMenu && (searchQuery || isSearching || isTyping) && (
        <GlobalSearchMenu
          results={flatResults}
          focusedIndex={focusedIndex}
          onItemClick={handleResultClick}
          menuRef={menuRef}
          searchQuery={searchQuery}
          onItemSelect={onItemSelect}
          usePortal={usePortal}
          triggerRef={containerRef}
        />
      )}
    </div>
  )
}
