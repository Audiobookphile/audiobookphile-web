'use client'

import { ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react'
import { useMemo } from 'react'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import Dropdown, { DropdownItem } from '@/shared/ui/Dropdown'

interface EpisodesSortSelectProps {
  sortBy: string
  sortDesc: boolean
  onChange: (sortBy: string, sortDesc: boolean) => void
  disabled?: boolean
  className?: string
}

export default function EpisodesSortSelect({
  sortBy,
  sortDesc,
  onChange,
  disabled,
  className,
}: EpisodesSortSelectProps) {
  const t = useTypeSafeTranslations()

  const sortItems = useMemo<DropdownItem[]>(
    () => [
      { text: t('LabelPubDate'), value: 'publishedAt' },
      { text: t('LabelTitle'), value: 'title' },
      { text: t('LabelSeason'), value: 'season' },
      { text: t('LabelEpisode'), value: 'episode' },
      { text: t('LabelFilename'), value: 'audioFile.metadata.filename' },
    ],
    [t]
  )

  const displayItems = useMemo(() => {
    return sortItems.map((item) => {
      if (item.value === sortBy) {
        const Icon = sortDesc ? ArrowDownWideNarrow : ArrowUpNarrowWide
        return {
          ...item,
          rightIcon: (
            <Icon
              size={16}
              className="text-primary opacity-80"
              aria-label={sortDesc ? t('LabelSortDescending') : t('LabelSortAscending')}
            />
          ),
        }
      }
      return item
    })
  }, [sortItems, sortBy, sortDesc, t])

  const handleSortChange = (newSortBy: string | number) => {
    const val = String(newSortBy)
    if (val === sortBy) {
      onChange(val, !sortDesc)
    } else {
      const defaultDesc = val === 'publishedAt'
      onChange(val, defaultDesc)
    }
  }

  const Icon = sortDesc ? ArrowDownWideNarrow : ArrowUpNarrowWide
  const rightIcon = (
    <Icon
      size={16}
      className="text-primary"
      aria-label={sortDesc ? t('LabelSortDescending') : t('LabelSortAscending')}
    />
  )

  return (
    <div className={className}>
      <Dropdown
        value={sortBy}
        items={displayItems}
        onChange={handleSortChange}
        size="auto"
        rightIcon={rightIcon}
        className="h-9 text-[11px] font-black tracking-widest uppercase"
        highlightSelected={true}
        menuMaxHeight="none"
        disabled={disabled}
      />
    </div>
  )
}
