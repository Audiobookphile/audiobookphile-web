import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import Indicator from './Indicator'

interface OnlineIndicatorProps {
  value: boolean
  className?: string
}

const OnlineIndicator = ({ value, className }: OnlineIndicatorProps) => {
  const t = useTypeSafeTranslations()
  const statusText = value ? t('LabelOnline') : t('LabelOffline')

  return (
    <Indicator role="status" tooltipText={statusText} className={className}>
      {value ? (
        <div className="h-3 w-3 animate-pulse text-success">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="currentColor" />
          </svg>
        </div>
      ) : (
        <svg className="h-3 w-3 text-foreground/20" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="currentColor" />
        </svg>
      )}
    </Indicator>
  )
}

export default OnlineIndicator
