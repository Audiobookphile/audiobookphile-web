'use client'

import { useMemo } from 'react'
import PreviewCover from '@/features/metadata/components/PreviewCover'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import Checkbox from '@/shared/ui/Checkbox'
import TextInput from '@/shared/ui/TextInput'

interface CoverMatchFieldEditorProps {
  usageChecked: boolean
  onUsageChange: (value: boolean) => void
  coverUrl: string
  currentCoverUrl: string | null
}

export default function CoverMatchFieldEditor({
  usageChecked,
  onUsageChange,
  coverUrl,
  currentCoverUrl,
}: CoverMatchFieldEditorProps) {
  const t = useTypeSafeTranslations()

  const displayCoverUrl = useMemo(() => coverUrl || '', [coverUrl])

  return (
    <div className="flex flex-wrap items-center justify-center md:flex-nowrap">
      <div className="flex grow items-center py-2">
        <Checkbox value={usageChecked} onChange={onUsageChange} checkboxBgClass="bg-bg" />
        <TextInput
          value={displayCoverUrl}
          onChange={() => {}}
          disabled={!usageChecked}
          readOnly
          label={t('LabelCover')}
          className="mx-4 grow"
        />
      </div>
      <div className="flex gap-2 py-2">
        <div>
          <p className="text-center text-foreground-muted">{t('LabelNew')}</p>
          <a href={displayCoverUrl} target="_blank" rel="noopener noreferrer" className="bg-primary">
            <PreviewCover src={displayCoverUrl} width={100} />
          </a>
        </div>
        {currentCoverUrl && (
          <div>
            <p className="text-center text-foreground-muted">{t('LabelCurrent')}</p>
            <a href={currentCoverUrl} target="_blank" rel="noopener noreferrer" className="bg-primary">
              <PreviewCover src={currentCoverUrl} width={100} />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
