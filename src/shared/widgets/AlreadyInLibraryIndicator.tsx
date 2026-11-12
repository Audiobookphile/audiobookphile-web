import { CircleCheckBig } from 'lucide-react'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { mergeClasses } from '@/shared/lib/merge-classes'
import Indicator from './Indicator'

interface AlreadyInLibraryIndicatorProps {
  className?: string
}

const AlreadyInLibraryIndicator = ({ className }: AlreadyInLibraryIndicatorProps) => {
  const t = useTypeSafeTranslations()
  return (
    <Indicator tooltipText={t('LabelAlreadyInYourLibrary')} className={mergeClasses('text-success', className)}>
      <CircleCheckBig size={14} strokeWidth={2.5} aria-hidden="true" />
    </Indicator>
  )
}

export default AlreadyInLibraryIndicator
