'use client'

import { useMemo } from 'react'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import Dropdown, { DropdownItem } from '@/shared/ui/Dropdown'

interface EpisodesFilterSelectProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

export default function EpisodesFilterSelect({ value, onChange, disabled, className }: EpisodesFilterSelectProps) {
  const t = useTypeSafeTranslations()

  const filterItems = useMemo<DropdownItem[]>(
    () => [
      { text: t('LabelShowAll'), value: 'all' },
      { text: t('LabelIncomplete'), value: 'incomplete' },
      { text: t('LabelComplete'), value: 'complete' },
      { text: t('LabelInProgress'), value: 'in_progress' },
    ],
    [t]
  )

  const currentLabel = useMemo(() => {
    const item = filterItems.find((i) => i.value === value)
    return item ? item.text : value
  }, [value, filterItems])

  return (
    <div className={className}>
      <Dropdown
        value={value}
        items={filterItems}
        onChange={(val) => onChange(String(val))}
        size="auto"
        className="h-9 text-xs"
        displayText={currentLabel}
        disabled={disabled}
      />
    </div>
  )
}
