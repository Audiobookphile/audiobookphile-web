'use client'

import { Calendar, Clock } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { calculateNextRunDate, getHumanReadableCronExpression, validateCron } from '@/shared/lib/cron'
import { mergeClasses } from '@/shared/lib/merge-classes'
import { capitalizeFirstLetter } from '@/shared/lib/string'

interface CronExpressionPreviewProps {
  cronExpression: string
  className?: string
  isValid?: boolean
  options?: {
    language?: string
    dateFormat?: string
    timeFormat?: string
    timeZone?: string
  }
}

export default function CronExpressionPreview({
  cronExpression,
  className,
  isValid: isValidProp,
  options,
}: CronExpressionPreviewProps) {
  const t = useTypeSafeTranslations()
  const [clientTimeZone, setClientTimeZone] = useState<string | null>(null)

  useEffect(() => {
    setClientTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
  }, [])

  const { isValid, verbalDescription, nextRunDate } = useMemo(() => {
    const isValid = isValidProp !== undefined ? isValidProp : validateCron(cronExpression).isValid
    const verbalDescription = isValid ? getHumanReadableCronExpression(cronExpression, options?.language || 'en') : ''
    const nextRunDate = isValid
      ? capitalizeFirstLetter(calculateNextRunDate(cronExpression, options, clientTimeZone))
      : ''

    return { isValid, verbalDescription, nextRunDate }
  }, [cronExpression, isValidProp, options, clientTimeZone])

  if (!isValid || !cronExpression) {
    return null
  }

  return (
    <div
      className={mergeClasses(
        'rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl backdrop-blur-md',
        className
      )}
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-[auto_1fr]">
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-primary/20 bg-primary/20 p-1.5">
            <Clock size={16} className="text-primary" />
          </div>
          <p className="text-[10px] font-black tracking-widest text-white/60 uppercase">{t('LabelSchedule')}</p>
        </div>
        <p className="py-1 font-medium text-white/90" cy-id="cron-description">
          {verbalDescription}
        </p>

        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-success/20 bg-success/20 p-1.5">
            <Calendar size={16} className="text-success" />
          </div>
          <p className="text-[10px] font-black tracking-widest text-white/60 uppercase">{t('LabelNextRun')}</p>
        </div>
        <p className="py-1 font-medium text-white/90">{nextRunDate || t('LabelNotAvailable')}</p>
      </div>
    </div>
  )
}
