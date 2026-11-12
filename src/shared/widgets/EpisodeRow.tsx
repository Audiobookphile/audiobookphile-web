import { motion } from 'framer-motion'
import DOMPurify from 'isomorphic-dompurify'
import { Edit, ListPlus, Pause, Play, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useUser } from '@/shared/contexts/UserContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { formatJsDate } from '@/shared/lib/datefns'
import { formatDuration } from '@/shared/lib/formatDuration'
import Btn from '@/shared/ui/Btn'
import Checkbox from '@/shared/ui/Checkbox'
import ContextMenuDropdown, { ContextMenuDropdownItem } from '@/shared/ui/ContextMenuDropdown'
import IconBtn from '@/shared/ui/IconBtn'
import ReadIconBtn from '@/shared/ui/ReadIconBtn'
import Tooltip from '@/shared/ui/Tooltip'
import ConfirmDialog, { type ConfirmState } from '@/shared/widgets/ConfirmDialog'
import { MediaProgress, PodcastEpisode } from '@/types/api'

/** Fixed height of a single episode row (px). Used by EpisodeTable virtualizer and minHeight. */
export const EPISODE_ROW_HEIGHT_PX = 176

export interface EpisodeRowProps {
  episode: PodcastEpisode
  libraryItemId: string
  sortKey: string
  progress: MediaProgress | null
  isSelected: boolean
  isSelectionMode: boolean
  dateFormat: string
  onPlay: (episode: PodcastEpisode) => void
  onView: (episode: PodcastEpisode) => void
  onToggleFinished: (episode: PodcastEpisode) => void
  onSelect: (episode: PodcastEpisode, isSelected: boolean) => void
  onEdit?: (episode: PodcastEpisode) => void
  onRemove?: (episode: PodcastEpisode, hardDelete: boolean) => void
  onDownloadFile?: (episode: PodcastEpisode) => void
  onShowMoreInfo?: (episode: PodcastEpisode) => void
  onAddToPlaylist?: (episode: PodcastEpisode) => void
  isPlayingThisEpisode: boolean
  rowIndex: number
}

export default function EpisodeRow({
  episode,
  sortKey,
  progress,
  isSelected,
  isSelectionMode,
  dateFormat,
  isPlayingThisEpisode,
  onPlay,
  onView,
  onToggleFinished,
  onSelect,
  onEdit,
  onRemove,
  onDownloadFile,
  onShowMoreInfo,
  onAddToPlaylist,
}: EpisodeRowProps) {
  const t = useTypeSafeTranslations()
  const { userCanUpdate, userCanDelete, userCanDownload, userIsAdminOrUp } = useUser()
  const [isHovering, setIsHovering] = useState(false)
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)

  const contextMenuItems = useMemo(() => {
    const items: ContextMenuDropdownItem[] = []
    if (userCanDownload) items.push({ text: t('LabelDownload'), action: 'download' })
    if (userIsAdminOrUp && episode.audioFile) items.push({ text: t('LabelMoreInfo'), action: 'more' })
    return items
  }, [userCanDownload, userIsAdminOrUp, episode.audioFile, t])

  const closeConfirm = () => setConfirmState(null)

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmState({
      isOpen: true,
      message: t('MessageConfirmDeleteEpisode', { 0: episode.title }),
      checkboxLabel: t('LabelDeleteFromFileSystemCheckbox'),
      yesButtonText: t('ButtonDelete'),
      yesButtonClassName: 'bg-error',
      onConfirm: (hardDelete?: boolean) => {
        setConfirmState(null)
        onRemove?.(episode, !!hardDelete)
      },
    })
  }

  const userIsFinished = progress?.isFinished || false
  const progressPercent = progress?.progress || 0
  const streamIsPlaying = isPlayingThisEpisode

  const timeRemaining = useMemo(() => {
    if (streamIsPlaying) return t('ButtonPlaying')
    if (!progress) return formatDuration(episode.audioTrack?.duration || 0, t)
    if (userIsFinished) return t('LabelFinished')

    const duration = progress.duration || episode.audioTrack?.duration || 0
    const remaining = Math.floor(duration - (progress.currentTime || 0))
    return t('LabelTimeLeft', { 0: formatDuration(remaining, t) })
  }, [streamIsPlaying, progress, userIsFinished, episode.audioTrack?.duration, t])

  const publishedDate = episode.publishedAt ? formatJsDate(new Date(episode.publishedAt), dateFormat) : ''

  // Stamp tabindex="-1" and pointer-events:none on all anchor tags in the raw HTML
  // before injection. A post-mount effect is unreliable with virtual scrolling (row reuse).
  const descriptionHtml = (episode.subtitle || episode.description || '').replace(
    /<a\b/gi,
    '<a tabindex="-1" style="pointer-events:none"'
  )

  const handleRowClick = () => {
    onView(episode)
  }

  return (
    <>
      <div
        className="group/row relative h-44 w-full overflow-hidden border-b border-white/5 px-3 py-3 transition-all duration-300 hover:bg-white/[0.03]"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Main content */}
        <div className="flex h-full flex-col rounded-xl" onClick={handleRowClick}>
          <div className="flex min-h-0 w-full flex-1">
            <div className="flex min-w-0 grow flex-col justify-start">
              {/* Title */}
              <div
                dir="auto"
                className="relative flex h-10 w-full flex-shrink-0 items-center pe-2 break-words whitespace-normal"
              >
                <button
                  id={`btn-episode-${episode.id}`}
                  type="button"
                  className={`line-clamp-2 cursor-pointer rounded-lg text-start text-[13px] leading-tight font-black tracking-tight uppercase transition-colors focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 sm:text-sm ${userIsFinished ? 'text-white/40' : 'text-white/90'}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRowClick()
                  }}
                >
                  {episode.title}
                </button>
              </div>

              {/* Subtitle/Description */}
              <div className="relative mt-2 mb-1 flex h-10 min-h-0 items-start overflow-hidden pe-12">
                <div
                  dir="auto"
                  className="line-clamp-2 w-full text-xs leading-relaxed font-medium break-words whitespace-normal text-white/40"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(descriptionHtml) }} /* lefthook-ignore */
                  onClick={(e) => {
                    if ((e.target as HTMLElement).tagName.toLowerCase() === 'a') {
                      e.stopPropagation()
                    }
                  }}
                />
              </div>

              {/* Metadata row */}
              <div className="flex h-7 w-full flex-shrink-0 items-center">
                {sortKey === 'audioFile.metadata.filename' ? (
                  <p className="truncate text-[11px] font-bold tracking-widest text-white/30 uppercase">
                    <span className="text-white/20">{t('LabelFilename')}</span>: {episode.audioFile?.metadata?.filename}
                  </p>
                ) : (
                  <div className="inline-flex w-full max-w-xl justify-between gap-4 overflow-hidden pr-12">
                    {episode.season && (
                      <p className="text-[10px] font-black tracking-widest whitespace-nowrap text-white/30 uppercase">
                        {t('LabelSeasonNumber', { 0: episode.season })}
                      </p>
                    )}
                    {episode.episode && (
                      <p className="text-[10px] font-black tracking-widest whitespace-nowrap text-white/30 uppercase">
                        {t('LabelEpisodeNumber', { 0: episode.episode })}
                      </p>
                    )}
                    {publishedDate && (
                      <p className="text-[10px] font-black tracking-widest whitespace-nowrap text-white/30 uppercase">
                        {t('LabelPublishedDate', { 0: publishedDate })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Selection checkbox area */}
            <div
              className={`absolute top-4 right-3 z-10 flex flex-shrink-0 items-center justify-center transition-all duration-300 ${isHovering || isSelected || isSelectionMode ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                value={isSelected}
                onChange={(checked) => onSelect(episode, checked)}
                ariaLabel={`Select ${episode.title}`}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-auto flex w-full items-center justify-between gap-2 pt-2">
            <div className="flex w-full items-center gap-2">
              <Btn
                color="bg-white/5"
                onClick={(e) => {
                  e.stopPropagation()
                  onPlay(episode)
                }}
                className={`h-9 flex-nowrap border border-white/5 px-3 shadow-lg backdrop-blur-md hover:border-white/10 hover:bg-white/10 ${userIsFinished ? 'text-white/30' : 'text-white/90'}`}
              >
                {streamIsPlaying ? (
                  <Pause size={18} className="fill-current text-accent" />
                ) : (
                  <Play size={18} className="fill-current text-success" />
                )}
                <span className="ps-2 text-[10px] font-black tracking-widest whitespace-nowrap uppercase">
                  {timeRemaining}
                </span>
              </Btn>

              <div className="mx-1 h-4 w-px bg-white/5" />

              <Tooltip
                position="top"
                text={userIsFinished ? t('MessageMarkAsNotFinished') : t('MessageMarkAsFinished')}
                className="flex-shrink-0"
              >
                <div onClick={(e) => e.stopPropagation()}>
                  <ReadIconBtn borderless isRead={userIsFinished} onClick={() => onToggleFinished(episode)} />
                </div>
              </Tooltip>

              <Tooltip position="top" text={t('LabelAddToPlaylist')} className="flex-shrink-0">
                <IconBtn
                  borderless
                  className="text-white/40 hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAddToPlaylist?.(episode)
                  }}
                  icon={ListPlus}
                />
              </Tooltip>

              {userCanUpdate && (
                <IconBtn
                  borderless
                  className="text-white/40 hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit?.(episode)
                  }}
                  icon={Edit}
                />
              )}

              {userCanDelete && (
                <IconBtn
                  borderless
                  className="text-white/20 hover:text-error"
                  onClick={handleDeleteClick}
                  icon={Trash2}
                />
              )}

              {episode.audioFile && contextMenuItems.length > 0 && (
                <div onClick={(e) => e.stopPropagation()} className="ms-auto flex-shrink-0">
                  <ContextMenuDropdown
                    items={contextMenuItems}
                    autoWidth
                    borderless
                    onAction={({ action }) => {
                      if (action === 'download') onDownloadFile?.(episode)
                      else if (action === 'more') onShowMoreInfo?.(episode)
                    }}
                    usePortal
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {!userIsFinished && progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 h-[2px] w-full overflow-hidden bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent * 100}%` }}
              className="h-full bg-accent shadow-[0_0_8px_rgba(245,158,11,0.5)]"
            />
          </div>
        )}
      </div>

      {confirmState && (
        <ConfirmDialog
          isOpen={confirmState.isOpen}
          message={confirmState.message}
          checkboxLabel={confirmState.checkboxLabel}
          yesButtonText={confirmState.yesButtonText}
          yesButtonClassName={confirmState.yesButtonClassName}
          onClose={closeConfirm}
          onConfirm={(value) => {
            confirmState.onConfirm(value)
          }}
        />
      )}
    </>
  )
}
