import { Clapperboard } from 'lucide-react'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import Indicator from './Indicator'

interface TrailerIndicatorProps {
  className?: string
}

const TrailerIndicator = ({ className }: TrailerIndicatorProps) => {
  const t = useTypeSafeTranslations()
  return (
    <Indicator tooltipText={t('LabelTrailer')} className={className}>
      <Clapperboard size={14} strokeWidth={2.5} aria-hidden="true" />
    </Indicator>
  )
}

export default TrailerIndicator
