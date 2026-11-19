'use client'

import { Bookmark, Keyboard, List, ListMusic, Pause, Play, RotateCcw, RotateCw, Settings2, SkipBack, SkipForward, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useMediaContext } from '@/features/player/contexts/MediaContext'
import type { UsePlayerHandlerReturn } from '@/features/player/hooks/usePlayerHandler'
import { useGlobalToast } from '@/shared/contexts/ToastContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { PlayerState } from '@/types/api'
import IconBtn from '../../../shared/ui/IconBtn'
import Tooltip from '../../../shared/ui/Tooltip'
import BookmarksModal from './BookmarksModal'
import ChaptersModal from './ChaptersModal'
import EqualizerWidget from './EqualizerWidget'
import KeyboardShortcutsModal from './KeyboardShortcutsModal'
import PlaybackRateWidget from './PlaybackRateWidget'
import PlayerSettingsModal from './PlayerSettingsModal'
import QueueModal from './QueueModal'
import SleepTimerWidget from './SleepTimerWidget'
import VolumeControl from './VolumeControl'

export interface PlayerTransportControlsProps {
  playerHandler: UsePlayerHandlerReturn
}

const QUICK_JUMP_AMOUNTS = [5, 10, 15, 30, 45, 60] as const

export function PlayerTransportControls({ playerHandler }: PlayerTransportControlsProps) {
  const t = useTypeSafeTranslations()
  const { showToast } = useGlobalToast()
  const { jumpBackward, jumpForward, playPause, seek, updateSettings } = playerHandler.controls
  const { nextChapter, previousChapter, currentChapter, playerState, currentTime, settings } = playerHandler.state

  const isPlaying = playerState === PlayerState.PLAYING
  const isLoading = playerState === PlayerState.LOADING

  const getJumpTooltipText = (prefix: string, jumpTime: number) => {
    const timeText =
      jumpTime <= 60
        ? t('LabelTimeDurationXSeconds', { 0: jumpTime })
        : t('LabelTimeDurationXMinutes', { 0: jumpTime / 60 })
    return `${prefix} - ${timeText}`
  }

  const jumpBackwardTooltipText = `${getJumpTooltipText(t('ButtonJumpBackward'), settings.jumpBackwardAmount)} (Right-click to change duration)`
  const jumpForwardTooltipText = `${getJumpTooltipText(t('ButtonJumpForward'), settings.jumpForwardAmount)} (Right-click to change duration)`

  const cycleJumpBackward = (e: React.MouseEvent) => {
    e.preventDefault()
    const currentIndex = QUICK_JUMP_AMOUNTS.indexOf(settings.jumpBackwardAmount as (typeof QUICK_JUMP_AMOUNTS)[number])
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % QUICK_JUMP_AMOUNTS.length
    const newAmount = QUICK_JUMP_AMOUNTS[nextIndex]
    updateSettings({ jumpBackwardAmount: newAmount })
    showToast(`Jump backward: ${newAmount}s`, { type: 'info' })
  }

  const cycleJumpForward = (e: React.MouseEvent) => {
    e.preventDefault()
    const currentIndex = QUICK_JUMP_AMOUNTS.indexOf(settings.jumpForwardAmount as (typeof QUICK_JUMP_AMOUNTS)[number])
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % QUICK_JUMP_AMOUNTS.length
    const newAmount = QUICK_JUMP_AMOUNTS[nextIndex]
    updateSettings({ jumpForwardAmount: newAmount })
    showToast(`Jump forward: ${newAmount}s`, { type: 'info' })
  }

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
    <div className="flex items-center justify-center gap-1.5 sm:gap-4">
      {/* Previous chapter */}
      <Tooltip text={t('ButtonPreviousChapter')} position="top">
        <IconBtn
          borderless
          size="custom"
          className="hidden p-1.5 text-foreground/60 transition-colors hover:text-foreground sm:inline-flex"
          onClick={handlePreviousChapter}
          ariaLabel={t('ButtonPreviousChapter')}
          icon={SkipBack}
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.9 }}
        />
      </Tooltip>

      {/* Jump backward */}
      <Tooltip text={jumpBackwardTooltipText} position="top">
        <div className="group relative" onContextMenu={cycleJumpBackward}>
          <IconBtn
            borderless
            size="custom"
            className="p-1.5 text-foreground/80 transition-colors hover:text-foreground"
            onClick={jumpBackward}
            onContextMenu={cycleJumpBackward}
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

      {/* Play/Pause Hero Button */}
      <div className="relative">
        <IconBtn
          borderless
          size="custom"
          loading={isLoading}
          outlined={false}
          className="h-11 w-11 rounded-full bg-primary text-white shadow-md shadow-primary/30 ring-2 ring-white/25 transition-all hover:bg-primary/90 hover:scale-105 active:scale-95 sm:h-12 sm:w-12"
          onClick={playPause}
          ariaLabel={isPlaying ? t('ButtonPause') : t('ButtonPlay')}
          icon={isPlaying ? Pause : Play}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          iconClass={isPlaying ? '' : 'ml-0.5'}
        />
      </div>

      {/* Jump forward */}
      <Tooltip text={jumpForwardTooltipText} position="top">
        <div className="group relative" onContextMenu={cycleJumpForward}>
          <IconBtn
            borderless
            size="custom"
            className="p-1.5 text-foreground/80 transition-colors hover:text-foreground"
            onClick={jumpForward}
            onContextMenu={cycleJumpForward}
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

      {/* Next chapter */}
      <Tooltip text={t('ButtonNextChapter')} position="top">
        <IconBtn
          borderless
          size="custom"
          className="hidden p-1.5 text-foreground/60 transition-colors hover:text-foreground sm:inline-flex"
          onClick={handleNextChapter}
          ariaLabel={t('ButtonNextChapter')}
          icon={SkipForward}
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.9 }}
        />
      </Tooltip>
    </div>
  )
}

export interface PlayerRightControlsProps {
  playerHandler: UsePlayerHandlerReturn
  onClose?: () => void
}

export function PlayerRightControls({ playerHandler, onClose }: PlayerRightControlsProps) {
  const t = useTypeSafeTranslations()
  const { streamLibraryItem, playerQueueItems } = useMediaContext()
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isChaptersModalOpen, setIsChaptersModalOpen] = useState(false)
  const [isBookmarksModalOpen, setIsBookmarksModalOpen] = useState(false)
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false)
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false)
  const { chapters } = playerHandler.state

  // Synchronize global hotkey events with modals
  useEffect(() => {
    const onToggleBookmarks = () => setIsBookmarksModalOpen((prev) => !prev)
    const onAddBookmark = () => setIsBookmarksModalOpen(true)
    const onToggleChapters = () => setIsChaptersModalOpen((prev) => !prev)
    const onToggleShortcuts = () => setIsShortcutsModalOpen((prev) => !prev)
    const onToggleQueue = () => setIsQueueModalOpen((prev) => !prev)

    window.addEventListener('audiobookphile:toggle-bookmarks', onToggleBookmarks)
    window.addEventListener('audiobookphile:add-bookmark', onAddBookmark)
    window.addEventListener('audiobookphile:toggle-chapters', onToggleChapters)
    window.addEventListener('audiobookphile:toggle-shortcuts', onToggleShortcuts)
    window.addEventListener('audiobookphile:toggle-queue', onToggleQueue)

    return () => {
      window.removeEventListener('audiobookphile:toggle-bookmarks', onToggleBookmarks)
      window.removeEventListener('audiobookphile:add-bookmark', onAddBookmark)
      window.removeEventListener('audiobookphile:toggle-chapters', onToggleChapters)
      window.removeEventListener('audiobookphile:toggle-shortcuts', onToggleShortcuts)
      window.removeEventListener('audiobookphile:toggle-queue', onToggleQueue)
    }
  }, [])

  return (
    <>
      <div className="flex items-center justify-end gap-1 sm:gap-2">
        {/* Volume control */}
        <div className="hidden md:block">
          <VolumeControl playerHandler={playerHandler} />
        </div>

        {/* Playback rate widget */}
        <PlaybackRateWidget playerHandler={playerHandler} />

        {/* Sleep timer widget */}
        <SleepTimerWidget playerHandler={playerHandler} />

        {/* Speech clarity & voice boost equalizer widget */}
        <EqualizerWidget playerHandler={playerHandler} />

        {/* Chapters modal trigger */}
        {chapters.length > 0 && (
          <Tooltip text={t('LabelViewChapters') || 'View chapters (C)'} position="top">
            <IconBtn
              size="custom"
              borderless
              className="p-1.5 text-foreground/60 transition-colors hover:text-foreground"
              onClick={() => setIsChaptersModalOpen(true)}
              ariaLabel={t('LabelViewChapters')}
              icon={List}
            />
          </Tooltip>
        )}

        {/* Bookmarks modal trigger */}
        <Tooltip text={t('LabelViewBookmarks') || 'View bookmarks (B)'} position="top">
          <IconBtn
            size="custom"
            borderless
            className="p-1.5 text-foreground/60 transition-colors hover:text-foreground"
            onClick={() => setIsBookmarksModalOpen(true)}
            ariaLabel={t('LabelViewBookmarks') || 'View bookmarks'}
            icon={Bookmark}
            whileHover={{ scale: 1.1 }}
          />
        </Tooltip>

        {/* Up Next / Playback Queue trigger */}
        <Tooltip text={t('LabelViewQueue') || 'Playback Queue (Q)'} position="top">
          <div className="relative">
            <IconBtn
              size="custom"
              borderless
              className="p-1.5 text-foreground/60 transition-colors hover:text-foreground"
              onClick={() => setIsQueueModalOpen(true)}
              ariaLabel={t('LabelViewQueue') || 'Playback Queue'}
              icon={ListMusic}
              whileHover={{ scale: 1.1 }}
            />
            {playerQueueItems.length > 1 && (
              <span className="pointer-events-none absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-black shadow-xs">
                {playerQueueItems.length}
              </span>
            )}
          </div>
        </Tooltip>

        {/* Keyboard shortcuts trigger */}
        <Tooltip text="Keyboard shortcuts (?)" position="top">
          <IconBtn
            size="custom"
            borderless
            className="hidden p-1.5 text-foreground/60 transition-colors hover:text-foreground sm:inline-flex"
            onClick={() => setIsShortcutsModalOpen(true)}
            ariaLabel="Keyboard shortcuts"
            icon={Keyboard}
            whileHover={{ scale: 1.1 }}
          />
        </Tooltip>

        {/* Player settings modal trigger */}
        <Tooltip text={t('LabelViewPlayerSettings')} position="top">
          <IconBtn
            size="custom"
            borderless
            className="p-1.5 text-foreground/60 transition-colors hover:text-foreground"
            onClick={() => setIsSettingsModalOpen(true)}
            ariaLabel={t('LabelViewPlayerSettings')}
            icon={Settings2}
            whileHover={{ rotate: 30 }}
          />
        </Tooltip>

        {/* Close player button */}
        {onClose && (
          <Tooltip text="Close player (Esc)" position="top">
            <IconBtn
              size="custom"
              borderless
              className="p-1.5 text-foreground/60 transition-colors hover:text-foreground"
              onClick={onClose}
              ariaLabel="Close player"
              icon={X}
              whileHover={{ rotate: 90, scale: 1.1 }}
            />
          </Tooltip>
        )}
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
      <BookmarksModal
        isOpen={isBookmarksModalOpen}
        libraryItemId={streamLibraryItem?.id ?? null}
        playerHandler={playerHandler}
        onClose={() => setIsBookmarksModalOpen(false)}
      />
      <QueueModal
        isOpen={isQueueModalOpen}
        onClose={() => setIsQueueModalOpen(false)}
      />
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </>
  )
}

export interface PlayerControlsProps {
  playerHandler: UsePlayerHandlerReturn
  onClose?: () => void
}

export default function PlayerControls({ playerHandler, onClose }: PlayerControlsProps) {
  return (
    <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-2">
      <div className="hidden flex-1 lg:flex" />
      <div className="flex flex-1 items-center justify-center">
        <PlayerTransportControls playerHandler={playerHandler} />
      </div>
      <div className="flex flex-1 items-center justify-end">
        <PlayerRightControls playerHandler={playerHandler} onClose={onClose} />
      </div>
    </div>
  )
}
