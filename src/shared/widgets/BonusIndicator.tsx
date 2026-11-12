import { Play } from 'lucide-react'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import Indicator from './Indicator'

interface BonusIndicatorProps {
  className?: string
}

const BonusIndicator = ({ className }: BonusIndicatorProps) => {
  const t = useTypeSafeTranslations()
  return (
    <Indicator tooltipText={t('LabelBonus')} className={className}>
      <Play size={14} strokeWidth={2.5} aria-hidden="true" />
    </Indicator>
  )
}

export default BonusIndicator
