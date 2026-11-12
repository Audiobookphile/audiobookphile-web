'use client'

import { ReactNode } from 'react'
import { mergeClasses } from '@/shared/lib/merge-classes'
import Checkbox from '@/shared/ui/Checkbox'

interface BaseMatchFieldEditorProps {
  usageChecked: boolean
  onUsageChange: (checked: boolean) => void
  currentValueDisplay?: ReactNode
  isCheckboxField?: boolean
  hasCurrentValue?: boolean
  className?: string
  children: ReactNode
}

export function BaseMatchFieldEditor({
  usageChecked,
  onUsageChange,
  currentValueDisplay,
  isCheckboxField = false,
  hasCurrentValue = false,
  className,
  children,
}: BaseMatchFieldEditorProps) {
  const wrapperClass = isCheckboxField
    ? mergeClasses('flex items-center pb-2', hasCurrentValue ? '' : 'pt-2')
    : 'flex items-center py-2'

  const contentClass = isCheckboxField
    ? mergeClasses('grow ml-4', hasCurrentValue ? 'pt-4' : '', className)
    : mergeClasses('grow ml-4', className)

  return (
    <div className={wrapperClass}>
      <Checkbox value={usageChecked} onChange={onUsageChange} checkboxBgClass="bg-bg" />
      <div className={contentClass}>
        {children}
        {hasCurrentValue && currentValueDisplay && (
          <p className="ml-1 text-xs text-foreground-subdued">{currentValueDisplay}</p>
        )}
      </div>
    </div>
  )
}
