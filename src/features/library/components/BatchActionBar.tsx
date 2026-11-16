'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, CheckCircle2, RotateCcw, X } from 'lucide-react'
import { useTransition } from 'react'
import { batchUpdateMediaFinishedAction } from '@/features/player/actions/mediaActions'
import { useGlobalToast } from '@/shared/contexts/ToastContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import Tooltip from '@/shared/ui/Tooltip'

export interface BatchActionBarProps {
  isVisible: boolean
  selectedIds: Set<string>
  totalCount: number
  onToggleSelectAll: () => void
  onClearSelection: () => void
  onUpdateSuccess?: () => void
}

export default function BatchActionBar({
  isVisible,
  selectedIds,
  totalCount,
  onToggleSelectAll,
  onClearSelection,
  onUpdateSuccess,
}: BatchActionBarProps) {
  const t = useTypeSafeTranslations()
  const { showToast } = useGlobalToast()
  const [isPending, startTransition] = useTransition()

  const count = selectedIds.size
  const isAllSelected = totalCount > 0 && count === totalCount

  const handleBatchMarkFinished = (isFinished: boolean) => {
    if (count === 0) return
    startTransition(async () => {
      try {
        const payload = Array.from(selectedIds).map((id) => ({
          libraryItemId: id,
          isFinished,
        }))
        await batchUpdateMediaFinishedAction(payload)
        showToast(t('ToastBatchUpdateSuccess'), { type: 'success' })
        onUpdateSuccess?.()
        onClearSelection()
      } catch (err) {
        console.error('Batch update failed:', err)
        showToast(t('ToastBatchUpdateFailed'), { type: 'error' })
      }
    })
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full border border-white/20 bg-background/85 px-5 py-2.5 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10"
        >
          {/* Select all toggle */}
          <button
            type="button"
            onClick={onToggleSelectAll}
            className="flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-foreground/80 hover:bg-white/10 transition-colors"
          >
            <div
              className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                count > 0 ? 'border-primary bg-primary text-primary-foreground' : 'border-white/30'
              }`}
            >
              {count > 0 && <Check className="h-3 w-3 stroke-[3]" />}
            </div>
            <span>{isAllSelected ? t('LabelDeselectAll') : t('LabelSelectAll')}</span>
          </button>

          <div className="h-4 w-px bg-white/20" />

          {/* Selected count badge */}
          <span className="text-xs font-semibold text-foreground/90 whitespace-nowrap">
            {t('MessageSelected', { 0: count })}
          </span>

          <div className="h-4 w-px bg-white/20" />

          {/* Batch Mark Finished */}
          <Tooltip text={t('MessageMarkAsFinished')}>
            <button
              type="button"
              disabled={count === 0 || isPending}
              onClick={() => handleBatchMarkFinished(true)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('MessageMarkAsFinished')}</span>
            </button>
          </Tooltip>

          {/* Batch Mark Unfinished */}
          <Tooltip text={t('MessageMarkAsNotFinished')}>
            <button
              type="button"
              disabled={count === 0 || isPending}
              onClick={() => handleBatchMarkFinished(false)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/10 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">{t('MessageMarkAsNotFinished')}</span>
            </button>
          </Tooltip>

          <div className="h-4 w-px bg-white/20" />

          {/* Exit / Done button */}
          <Tooltip text={t('ButtonClose')}>
            <button
              type="button"
              onClick={onClearSelection}
              className="flex h-6 w-6 items-center justify-center rounded-full text-foreground/60 hover:bg-white/10 hover:text-foreground transition-colors"
              aria-label="Exit selection mode"
            >
              <X className="h-4 w-4" />
            </button>
          </Tooltip>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
