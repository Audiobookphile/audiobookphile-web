import { List, Pause, Play, RotateCcw, RotateCw, Settings2, SkipBack, SkipForward } from 'lucide-react'
import { useState } from 'react'
import type { UsePlayerHandlerReturn } from '@/features/player/hooks/usePlayerHandler'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { PlayerState } from '@/types/api'
import IconBtn from '../../../shared/ui/IconBtn'
import Tooltip from '../../../shared/ui/Tooltip'
import ChaptersModal from './ChaptersModal'
import PlaybackRateWidget from './PlaybackRateWidget'
import PlayerSettingsModal from './PlayerSettingsModal'
import SleepTimerWidget from './SleepTimerWidget'
import VolumeControl from './VolumeControl'

interface PlayerControlsProps {
  playerHandler: UsePlayerHandlerReturn
}

export default function PlayerControls({ playerHandler }: PlayerControlsProps) {
  const t = useTypeSafeTranslations()
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isChaptersModalOpen, setIsChaptersModalOpen] = useState(false)
  const { jumpBackward, jumpForward, playPause, seek } = playerHandler.controls
  const { nextChapter, previousChapter, currentChapter, playerState, currentTime, settings, chapters } =
    playerHandler.state

  const isPlaying = playerState === PlayerState.PLAYING
  const isLoading = playerState === PlayerState.LOADING

  const getJumpTooltipText = (prefix: string, jumpTime: number) => {
    const timeText =
      jumpTime <= 60
        ? t('LabelTimeDurationXSeconds', { 0: jumpTime })
        : t('LabelTimeDurationXMinutes', { 0: jumpTime / 60 })
    return `${prefix} - ${timeText}`
  }

  const jumpBackwardTooltipText = getJumpTooltipText(t('ButtonJumpBackward'), settings.jumpBackwardAmount)
  const jumpForwardTooltipText = getJumpTooltipText(t('ButtonJumpForward'), settings.jumpForwardAmount)

  const handleNextChapter = () => {
    if (nextChapter) {
      seek(nextChapter.start)
    }
  }

  const handlePreviousChapter = () => {
    if (previousChapter) {
      const currentChapterStart = currentChapter?.start ?? 0
      const timeInCurrentChapter = currentTime - currentChapterStart
      if (timeInCurrentChapter <= 3) {
        seek(previousChapter.start)
      } else {
        seek(currentChapterStart)
      }
    } else {
      seek(0)
    }
  }

  return (
    <>
      <div className="mx-auto mt-0 flex w-full max-w-4xl items-center px-4">
        {/* Left section: Optional info/spacer */}
        <div className="hidden flex-1 lg:flex" />

        {/* Center - playback controls */}
        <div className="flex flex-1 items-center justify-center gap-2 sm:gap-6">
          {/* previous chapter */}
          <Tooltip text={t('ButtonPreviousChapter')} position="top">
            <IconBtn
              borderless
              size="custom"
              className="p-2 text-foreground/60 hover:text-foreground"
              onClick={handlePreviousChapter}
              ariaLabel={t('ButtonPreviousChapter')}
              icon={SkipBack}
              whileHover={{ x: -2 }}
              whileTap={{ scale: 0.9 }}
            />
          </Tooltip>

          {/* jump backward */}
          <Tooltip text={jumpBackwardTooltipText} position="top">
            <div className="group relative">
              <IconBtn
                borderless
                size="custom"
                className="p-2 text-foreground/80 hover:text-foreground"
                onClick={jumpBackward}
                ariaLabel={jumpBackwardTooltipText}
                icon={RotateCcw}
                whileHover={{ rotate: -15 }}
                whileTap={{ scale: 0.9 }}
              />
              <span className="pointer-events-none absolute inset-0 mt-0.5 flex items-center justify-center text-[8px] font-bold opacity-60 group-hover:opacity-100">
                {settings.jumpBackwardAmount}
              </span>
            </div>
          </Tooltip>

          {/* play/pause */}
          <div className="relative">
            <IconBtn
              borderless
              size="custom"
              loading={isLoading}
              outlined={false}
              className="h-14 w-14 rounded-full bg-primary text-white shadow-lg ring-2 shadow-primary/30 ring-white/25 transition-all hover:bg-primary/90 sm:h-16 sm:w-16"
              onClick={playPause}
              ariaLabel={isPlaying ? t('ButtonPause') : t('ButtonPlay')}
              icon={isPlaying ? Pause : Play}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              iconClass={isPlaying ? '' : 'ml-1'}
            />
          </div>

          {/* jump forward */}
          <Tooltip text={jumpForwardTooltipText} position="top">
            <div className="group relative">
              <IconBtn
                borderless
                size="custom"
                className="p-2 text-foreground/80 hover:text-foreground"
                onClick={jumpForward}
                ariaLabel={jumpForwardTooltipText}
                icon={RotateCw}
                whileHover={{ rotate: 15 }}
                whileTap={{ scale: 0.9 }}
              />
              <span className="pointer-events-none absolute inset-0 mt-0.5 flex items-center justify-center text-[8px] font-bold opacity-60 group-hover:opacity-100">
                {settings.jumpForwardAmount}
              </span>
            </div>
          </Tooltip>

          {/* next chapter */}
          <Tooltip text={t('ButtonNextChapter')} position="top">
            <IconBtn
              borderless
              size="custom"
              className="p-2 text-foreground/60 hover:text-foreground"
              onClick={handleNextChapter}
              ariaLabel={t('ButtonNextChapter')}
              icon={SkipForward}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.9 }}
            />
          </Tooltip>
        </div>

        {/* Right section: Widgets & Settings */}
        <div className="flex flex-1 items-center justify-end gap-1 sm:gap-4">
          {/* volume control */}
          <div className="hidden sm:block">
            <VolumeControl playerHandler={playerHandler} />
          </div>

          {/* playback rate widget */}
          <PlaybackRateWidget playerHandler={playerHandler} />

          {/* sleep timer widget */}
          <SleepTimerWidget playerHandler={playerHandler} />

          {/* chapters button */}
          {chapters.length > 0 && (
            <Tooltip text={t('LabelViewChapters')} position="top">
              <IconBtn
                size="custom"
                borderless
                className="p-2 text-foreground/60 hover:text-foreground"
                onClick={() => setIsChaptersModalOpen(true)}
                ariaLabel={t('LabelViewChapters')}
                icon={List}
              />
            </Tooltip>
          )}

          {/* player settings button */}
          <Tooltip text={t('LabelViewPlayerSettings')} position="top">
            <IconBtn
              size="custom"
              borderless
              className="p-2 text-foreground/60 hover:text-foreground"
              onClick={() => setIsSettingsModalOpen(true)}
              ariaLabel={t('LabelViewPlayerSettings')}
              icon={Settings2}
              whileHover={{ rotate: 30 }}
            />
          </Tooltip>
        </div>
      </div>

      <PlayerSettingsModal
        isOpen={isSettingsModalOpen}
        settings={playerHandler.state.settings}
        onClose={() => setIsSettingsModalOpen(false)}
        onUpdateSettings={playerHandler.controls.updateSettings}
      />
      <ChaptersModal
        isOpen={isChaptersModalOpen}
        playerHandler={playerHandler}
        onClose={() => setIsChaptersModalOpen(false)}
      />
    </>
  )
}
