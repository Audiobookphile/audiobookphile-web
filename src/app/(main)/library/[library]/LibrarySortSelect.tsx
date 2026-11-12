'use client'

import { ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react'
import { useCallback, useEffect, useMemo } from 'react'
import { LibrarySettingKey, useLibrary } from '@/features/library/contexts/LibraryContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import Dropdown, { DropdownItem } from '@/shared/ui/Dropdown'
import { EntityType } from '@/types/api'

interface LibrarySortSelectProps {
  entityType?: EntityType
  libraryMediaType?: 'book' | 'podcast'
}

// Default sort that works for both book and podcast libraries
const DEFAULT_SORT = 'media.metadata.title'

export default function LibrarySortSelect({ entityType = 'items', libraryMediaType = 'book' }: LibrarySortSelectProps) {
  const { orderBy, orderDesc, seriesSortBy, seriesSortDesc, authorSortBy, authorSortDesc, filterBy, updateSetting } =
    useLibrary()
  const t = useTypeSafeTranslations()

  const isPodcast = libraryMediaType === 'podcast'
  const isSeries = entityType === 'series'
  const isAuthors = entityType === 'authors'
  const isFilteredBySeries = !isSeries && !isAuthors && (filterBy?.startsWith('series.') ?? false)

  let currentSortBy = orderBy
  let currentSortDesc = orderDesc

  if (isSeries) {
    currentSortBy = seriesSortBy
    currentSortDesc = seriesSortDesc
  } else if (isAuthors) {
    currentSortBy = authorSortBy
    currentSortDesc = authorSortDesc
  }

  const defaultsToAsc = useCallback((val: string) => {
    return [
      'media.metadata.title',
      'media.metadata.author',
      'media.metadata.authorName',
      'media.metadata.authorNameLF',
      'sequence',
      'name',
      'lastFirst',
    ].includes(val)
  }, [])

  const handleSortChange = useCallback(
    (value: string | number) => {
      const val = String(value)
      if (currentSortBy === val) {
        // Toggle direction
        let key: LibrarySettingKey = 'orderDesc'
        if (isSeries) key = 'seriesSortDesc'
        else if (isAuthors) key = 'authorSortDesc'

        updateSetting(key, !currentSortDesc)
      } else {
        // New sort
        let key: LibrarySettingKey = 'orderBy'
        let descKey: LibrarySettingKey = 'orderDesc'
        if (isSeries) {
          key = 'seriesSortBy'
          descKey = 'seriesSortDesc'
        } else if (isAuthors) {
          key = 'authorSortBy'
          descKey = 'authorSortDesc'
        }

        updateSetting(key, val)
        if (defaultsToAsc(val)) {
          updateSetting(descKey, false)
        }
      }
    },
    [currentSortBy, currentSortDesc, isSeries, isAuthors, updateSetting, defaultsToAsc]
  )

  // Podcast sort items (matching Vue podcastItems)
  const podcastItems = useMemo(
    (): DropdownItem[] => [
      { text: t('LabelTitle'), value: 'media.metadata.title' },
      { text: t('LabelAuthor'), value: 'media.metadata.author' },
      { text: t('LabelAddedAt'), value: 'addedAt' },
      { text: t('LabelSize'), value: 'size' },
      { text: t('LabelNumberOfEpisodes'), value: 'media.numTracks' },
      { text: t('LabelFileBirthtime'), value: 'birthtimeMs' },
      { text: t('LabelFileModified'), value: 'mtimeMs' },
      { text: t('LabelRandomly'), value: 'random' },
    ],
    [t]
  )

  // Book sort items (matching Vue bookItems)
  const bookItems = useMemo(
    (): DropdownItem[] => [
      { text: t('LabelTitle'), value: 'media.metadata.title' },
      { text: t('LabelAuthorFirstLast'), value: 'media.metadata.authorName' },
      { text: t('LabelAuthorLastFirst'), value: 'media.metadata.authorNameLF' },
      { text: t('LabelPublishYear'), value: 'media.metadata.publishedYear' },
      { text: t('LabelAddedAt'), value: 'addedAt' },
      { text: t('LabelSize'), value: 'size' },
      { text: t('LabelDuration'), value: 'media.duration' },
      { text: t('LabelFileBirthtime'), value: 'birthtimeMs' },
      { text: t('LabelFileModified'), value: 'mtimeMs' },
      { text: t('LabelLibrarySortByProgress'), value: 'progress' },
      { text: t('LabelLibrarySortByProgressStarted'), value: 'progress.createdAt' },
      { text: t('LabelLibrarySortByProgressFinished'), value: 'progress.finishedAt' },
      { text: t('LabelRandomly'), value: 'random' },
    ],
    [t]
  )

  // Series sort items (bookItems + sequence, matching Vue seriesItems)
  const seriesItems = useMemo(
    (): DropdownItem[] => [...bookItems, { text: t('LabelSequence'), value: 'sequence' }],
    [bookItems, t]
  )

  // Series page sort items (for isSeries=true prop, different from filtering by series)
  const seriesPageItems = useMemo(
    (): DropdownItem[] => [
      { text: t('LabelName'), value: 'name' },
      { text: t('LabelNumberOfBooks'), value: 'numBooks' },
      { text: t('LabelAddedAt'), value: 'addedAt' },
      { text: t('LabelLastBookAdded'), value: 'lastBookAdded' },
      { text: t('LabelLastBookUpdated'), value: 'lastBookUpdated' },
      { text: t('LabelTotalDuration'), value: 'totalDuration' },
      { text: t('LabelRandomly'), value: 'random' },
    ],
    [t]
  )

  // Author page sort items
  const authorPageItems = useMemo(
    (): DropdownItem[] => [
      { text: t('LabelAuthorFirstLast'), value: 'name' },
      { text: t('LabelAuthorLastFirst'), value: 'lastFirst' },
      { text: t('LabelNumberOfBooks'), value: 'numBooks' },
      { text: t('LabelAddedAt'), value: 'addedAt' },
      { text: t('LabelUpdatedAt'), value: 'updatedAt' },
    ],
    [t]
  )

  // Get the available items based on current context (without sort icons)
  const availableItems = useMemo(() => {
    if (isAuthors) return authorPageItems
    if (isSeries) return seriesPageItems
    if (isPodcast) return podcastItems
    if (isFilteredBySeries) return seriesItems
    return bookItems
  }, [
    isSeries,
    isAuthors,
    isPodcast,
    isFilteredBySeries,
    seriesPageItems,
    authorPageItems,
    podcastItems,
    seriesItems,
    bookItems,
  ])

  // Auto-reset sort to a valid value when current sort doesn't exist in available items
  // This handles switching between library types with incompatible sort keys, or corrupted saved state
  useEffect(() => {
    const isValidSort = availableItems.some((item) => item.value === currentSortBy)
    if (!currentSortBy || !isValidSort) {
      if (isSeries) updateSetting('seriesSortBy', 'name')
      else if (isAuthors) updateSetting('authorSortBy', 'name')
      else updateSetting('orderBy', DEFAULT_SORT)
    }
  }, [availableItems, currentSortBy, isSeries, isAuthors, updateSetting])

  const sortItems = useMemo(() => {
    // Clone items to avoid mutating the memoized arrays
    const items = availableItems.map((item) => ({ ...item }))

    // Add sort direction arrow to the selected sort item
    if (currentSortBy) {
      const selectedItem = items.find((i) => i.value === currentSortBy)
      if (selectedItem) {
        const Icon = currentSortDesc ? ArrowDownWideNarrow : ArrowUpNarrowWide
        selectedItem.rightIcon = (
          <Icon
            size={16}
            className="text-primary opacity-80"
            aria-label={currentSortDesc ? t('LabelSortDescending') : t('LabelSortAscending')}
          />
        )
      }
    }

    return items
  }, [t, availableItems, currentSortBy, currentSortDesc])

  const Icon = currentSortDesc ? ArrowDownWideNarrow : ArrowUpNarrowWide
  const rightIcon = (
    <Icon
      size={16}
      className="text-primary"
      aria-label={currentSortDesc ? t('LabelSortDescending') : t('LabelSortAscending')}
    />
  )

  return (
    <div className="h-9 w-28 shrink-0 sm:w-44 md:w-48">
      <Dropdown
        value={currentSortBy}
        items={sortItems}
        onChange={handleSortChange}
        size="auto"
        rightIcon={rightIcon}
        className="h-full text-[11px] font-black tracking-widest uppercase"
        highlightSelected={true}
        menuMaxHeight="none"
      />
    </div>
  )
}
