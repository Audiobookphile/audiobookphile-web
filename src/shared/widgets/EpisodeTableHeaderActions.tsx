import { AnimatePresence, motion } from 'framer-motion'
import { Podcast, Trash2, X } from 'lucide-react'
import { useState, useTransition } from 'react'
import {
  batchUpdateMediaFinishedAction,
  deleteLibraryItemMediaEpisodeAction,
} from '@/features/player/actions/mediaActions'
import { useGlobalToast } from '@/shared/contexts/ToastContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import Btn from '@/shared/ui/Btn'
import IconBtn from '@/shared/ui/IconBtn'
import ReadIconBtn from '@/shared/ui/ReadIconBtn'
import Tooltip from '@/shared/ui/Tooltip'
import ConfirmDialog, { type ConfirmState } from '@/shared/widgets/ConfirmDialog'

interface EpisodeTableHeaderActionsProps {
  isSelectionMode: boolean
  selectedEpisodes: Set<string>
  allSelectedEpisodesFinished: boolean
  libraryItemId: string
  onClearSelection: () => void
  onFindEpisodes?: () => void
  isFetchingRSSFeed?: boolean
}

export default function EpisodeTableHeaderActions({
  isSelectionMode,
  selectedEpisodes,
  allSelectedEpisodesFinished,
  libraryItemId,
  onClearSelection,
  onFindEpisodes,
  isFetchingRSSFeed,
}: EpisodeTableHeaderActionsProps) {
  const t = useTypeSafeTranslations()
  const { showToast } = useGlobalToast()
  const [isPending, startTransition] = useTransition()
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)

  if (isSelectionMode) {
    const handleRemoveClick = () => {
      setConfirmState({
        isOpen: true,
        message: t('MessageConfirmRemoveEpisodes', { count: selectedEpisodes.size }),
        checkboxLabel: t('LabelDeleteFromFileSystemCheckbox'),
        yesButtonText: t('ButtonDelete'),
        yesButtonClassName: 'bg-error',
        onConfirm: (hardDelete?: boolean) => {
          setConfirmState(null)
          startTransition(async () => {
            try {
              for (const episodeId of Array.from(selectedEpisodes)) {
                await deleteLibraryItemMediaEpisodeAction(libraryItemId, episodeId, !!hardDelete)
              }
              onClearSelection()
            } catch (err: unknown) {
              console.error('Failed to batch remove episodes', err)
              showToast(t('ToastEpisodeBatchDeleteFailed'), { type: 'error' })
            }
          })
        },
      })
    }

    return (
      <div className="flex items-center gap-3">
        <Tooltip
          position="top"
          text={allSelectedEpisodesFinished ? t('MessageMarkAsNotFinished') : t('MessageMarkAsFinished')}
        >
          <ReadIconBtn
            size="small"
            isRead={allSelectedEpisodesFinished}
            onClick={() => {
              const markState = !allSelectedEpisodesFinished
              startTransition(async () => {
                try {
                  await batchUpdateMediaFinishedAction(
                    Array.from(selectedEpisodes).map((episodeId) => ({
                      libraryItemId,
                      episodeId,
                      isFinished: markState,
                    }))
                  )
                } catch (error) {
                  console.error('Failed to batch update selected episodes', error)
                  showToast(t('ToastFailedToUpdate'), { type: 'error' })
                } finally {
                  onClearSelection()
                }
              })
            }}
          />
        </Tooltip>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-2 sm:flex">
          <Btn
            color="bg-error"
            size="small"
            disabled={isPending}
            className="px-4 text-[11px] font-black tracking-widest uppercase"
            onClick={handleRemoveClick}
          >
            {t('MessageRemoveEpisodes', { 0: selectedEpisodes.size })}
          </Btn>
          <Btn
            size="small"
            className="border border-white/10 bg-white/5 px-4 text-[11px] font-black tracking-widest uppercase"
            onClick={onClearSelection}
            disabled={isPending}
          >
            {t('ButtonCancel')}
          </Btn>
        </div>

        {/* Mobile Actions */}
        <div className="relative flex items-center gap-2 sm:hidden">
          <div className="relative">
            <IconBtn
              size="small"
              disabled={isPending}
              ariaLabel={t('MessageRemoveEpisodes', { 0: selectedEpisodes.size })}
              className="border border-white/10 bg-error/90 text-white backdrop-blur-md"
              onClick={handleRemoveClick}
              icon={Trash2}
            />
            <AnimatePresence>
              {selectedEpisodes.size > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-2 -right-2 flex h-5 min-w-[20px] items-center justify-center rounded-full border border-white/20 bg-error px-1 text-[10px] font-black text-white shadow-lg"
                >
                  {selectedEpisodes.size}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <IconBtn
            size="small"
            disabled={isPending}
            className="border border-white/10 bg-white/5"
            ariaLabel={t('ButtonCancel')}
            onClick={onClearSelection}
            icon={X}
          />
        </div>

        {confirmState && (
          <ConfirmDialog
            isOpen={confirmState.isOpen}
            message={confirmState.message}
            checkboxLabel={confirmState.checkboxLabel}
            yesButtonText={confirmState.yesButtonText}
            yesButtonClassName={confirmState.yesButtonClassName}
            onClose={() => setConfirmState(null)}
            onConfirm={(value) => confirmState.onConfirm(value)}
          />
        )}
      </div>
    )
  }

  if (!onFindEpisodes) return null

  return (
    <Btn
      size="small"
      onClick={onFindEpisodes}
      loading={isFetchingRSSFeed}
      className="border border-white/10 bg-white/5 px-4 text-[11px] font-black tracking-widest uppercase backdrop-blur-md"
    >
      <span className="flex items-center gap-2">
        {t('LabelFindEpisodes')}
        <Podcast size={14} className="text-primary" />
      </span>
    </Btn>
  )
}
