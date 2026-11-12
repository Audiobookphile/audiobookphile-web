'use client'

import { AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useSocketEmit } from '@/shared/contexts/SocketContext'
import { useUser } from '@/shared/contexts/UserContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { formatDuration } from '@/shared/lib/formatDuration'
import Btn from '@/shared/ui/Btn'
import { Task } from '@/types/api'
import { TranslationKey } from '@/types/translations'
import LoadingSpinner from './LoadingSpinner'

interface ItemTaskRunningCardProps {
  task: Task
}

interface TaskScanResults {
  added?: number
  updated?: number
  missing?: number
  elapsed?: number
}

interface TaskDataWithScanResults {
  scanResults?: TaskScanResults
}

function mapSubsToValues(subs: string[] | null | undefined): Record<string, string> | undefined {
  if (!subs?.length) {
    return undefined
  }

  return subs.reduce<Record<string, string>>((acc, value, index) => {
    acc[index.toString()] = value
    return acc
  }, {})
}

function getTaskString(
  t: ReturnType<typeof useTypeSafeTranslations>,
  key: string | null,
  subs: string[] | null,
  fallback: string | null,
  defaultValue = ''
): string {
  if (!key) {
    return fallback || defaultValue
  }

  try {
    const values = mapSubsToValues(subs)
    return values ? t(key as TranslationKey, values) : t(key as TranslationKey)
  } catch {
    return fallback || defaultValue
  }
}

export default function ItemTaskRunningCard({ task }: ItemTaskRunningCardProps) {
  const t = useTypeSafeTranslations()
  const { emit } = useSocketEmit()
  const { userIsAdminOrUp } = useUser()
  const [cancelingScan, setCancelingScan] = useState(false)

  const isFinished = !!task.isFinished
  const isFailed = !!task.isFailed
  const isSuccess = isFinished && !isFailed

  const title = useMemo(() => {
    return getTaskString(t, task.titleKey, task.titleSubs, task.title, 'No Title')
  }, [t, task.title, task.titleKey, task.titleSubs])

  const description = useMemo(() => {
    return getTaskString(t, task.descriptionKey, task.descriptionSubs, task.description)
  }, [t, task.description, task.descriptionKey, task.descriptionSubs])

  const failedMessage = useMemo(() => {
    return getTaskString(t, task.errorKey, task.errorSubs, task.error)
  }, [t, task.error, task.errorKey, task.errorSubs])

  const action = task.action || ''

  const isLibraryScan = useMemo(() => {
    return action === 'library-scan' || action === 'library-match-all'
  }, [action])

  const specialMessage = useMemo(() => {
    const scanResults = (task.data as TaskDataWithScanResults | undefined)?.scanResults
    if (!scanResults) {
      return ''
    }

    const messages: string[] = []

    if (scanResults.added) {
      messages.push(t('MessageTaskScanItemsAdded', { 0: scanResults.added }))
    }
    if (scanResults.updated) {
      messages.push(t('MessageTaskScanItemsUpdated', { 0: scanResults.updated }))
    }
    if (scanResults.missing) {
      messages.push(t('MessageTaskScanItemsMissing', { 0: scanResults.missing }))
    }

    const changesDetected = messages.length > 0 ? messages.join(', ') : t('MessageTaskScanNoChangesNeeded')
    if (!scanResults.elapsed) {
      return changesDetected
    }

    const elapsed = formatDuration(scanResults.elapsed / 1000, t, {
      style: 'compact',
      showDays: true,
      showSeconds: true,
    })

    return elapsed ? `${changesDetected} (${elapsed})` : changesDetected
  }, [t, task.data])

  const cancelScan = useCallback(
    (event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
      event.preventDefault()
      event.stopPropagation()

      const libraryId = task.data?.libraryId
      if (!libraryId) {
        console.error('No library id in library-scan task', task)
        return
      }

      setCancelingScan(true)
      emit('cancel_scan', libraryId)
    },
    [emit, task]
  )

  return (
    <div className="flex items-start gap-3 px-3 py-2.5 transition-all">
      <div className="flex shrink-0 items-center justify-center pt-0.5">
        {isFailed ? (
          <div className="rounded-lg border border-error/20 bg-error/20 p-1.5">
            <AlertCircle size={16} className="text-error" />
          </div>
        ) : isSuccess ? (
          <div className="rounded-lg border border-success/20 bg-success/20 p-1.5">
            <CheckCircle2 size={16} className="text-success" />
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/5 p-1.5">
            <LoadingSpinner size="la-sm" className="!cursor-default opacity-80" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-2">
          <p className="truncate text-[11px] leading-none font-black tracking-widest text-white/90 uppercase">
            {title}
          </p>
          {!isFinished && (
            <div className="rounded-full border border-primary/20 bg-primary/20 px-1.5 py-0.5">
              <span className="text-[8px] font-black tracking-tighter text-primary uppercase">Live</span>
            </div>
          )}
        </div>

        {!!description && (
          <p className="line-clamp-2 text-[10px] leading-relaxed font-medium break-words whitespace-normal text-white/40">
            {description}
          </p>
        )}

        {!!specialMessage && (
          <div className="mt-1 flex items-center gap-1.5 text-white/50">
            <Clock size={10} className="shrink-0" />
            <p className="text-[9px] leading-none font-bold tracking-tight uppercase">{specialMessage}</p>
          </div>
        )}

        {isFailed && !!failedMessage && (
          <div className="mt-1.5 rounded-lg border border-error/10 bg-error/10 p-2">
            <p className="text-[10px] leading-tight font-medium break-words whitespace-normal text-error italic">
              {failedMessage}
            </p>
          </div>
        )}
      </div>

      {userIsAdminOrUp && !isFinished && isLibraryScan && !cancelingScan && (
        <Btn
          size="small"
          color="bg-white/10"
          className="h-7 shrink-0 border border-white/10 px-2 py-1 text-[9px] font-black tracking-widest uppercase transition-all hover:bg-white/20"
          onClick={cancelScan}
        >
          {t('ButtonCancel')}
        </Btn>
      )}
    </div>
  )
}
