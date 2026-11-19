import { useEffect } from 'react'
import type { PlayerHandlerControls, PlayerHandlerState } from '@/features/player/hooks/usePlayerHandler'
import { VOLUME_HOTKEY_STEP } from '@/features/player/lib/constants'
import { shouldDeferToFocusedElement } from '@/features/player/lib/hotkeyScope'

export interface AudioPlayerHotkeyActions {
  onToggleBookmarks?: () => void
  onToggleChapters?: () => void
  onToggleShortcuts?: () => void
  onToggleQueue?: () => void
  onToggleSleepTimer?: () => void
}

/**
 * Registers keyboard hotkeys for the audio player.
 *
 * The listener is on `document`, so it sees every key press in the app. The guard
 * therefore has to be per-key rather than a blanket "is an input focused": a
 * blanket guard that misses buttons and custom controls means Space toggles
 * playback while a button is focused, and ArrowRight both seeks the focused
 * scrubber and jumps the track. See shouldDeferToFocusedElement.
 */
export function useAudioPlayerHotkeys(
  state: PlayerHandlerState,
  controls: PlayerHandlerControls,
  enabled: boolean,
  onClose: () => void,
  actions?: AudioPlayerHotkeyActions
) {
  useEffect(() => {
    if (!enabled) return

    function handleKeyDown(e: KeyboardEvent) {
      if (shouldDeferToFocusedElement(document.activeElement, e.code, e.shiftKey)) return

      const key = e.shiftKey ? `Shift-${e.code}` : e.code

      switch (key) {
        case 'Space':
          controls.playPause()
          break
        case 'ArrowRight':
          controls.jumpForward()
          break
        case 'ArrowLeft':
          controls.jumpBackward()
          break
        case 'ArrowUp':
          controls.setVolume(Math.min(state.volume + VOLUME_HOTKEY_STEP, 1))
          break
        case 'ArrowDown':
          controls.setVolume(Math.max(state.volume - VOLUME_HOTKEY_STEP, 0))
          break
        case 'KeyM':
          controls.toggleMute()
          break
        case 'Shift-ArrowRight':
          controls.jumpToNextChapter()
          break
        case 'Shift-ArrowLeft':
          controls.jumpToPreviousChapter()
          break
        case 'Shift-ArrowUp':
        case 'BracketRight':
          controls.incrementPlaybackRate()
          break
        case 'Shift-ArrowDown':
        case 'BracketLeft':
          controls.decrementPlaybackRate()
          break
        case 'Digit0':
        case 'Numpad0':
          controls.setPlaybackRate(1)
          break
        case 'Shift-KeyB':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('audiobookphile:add-bookmark'))
          }
          break
        case 'KeyB':
          if (actions?.onToggleBookmarks) {
            actions.onToggleBookmarks()
          } else if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('audiobookphile:toggle-bookmarks'))
          }
          break
        case 'KeyC':
          if (actions?.onToggleChapters) {
            actions.onToggleChapters()
          } else if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('audiobookphile:toggle-chapters'))
          }
          break
        case 'KeyQ':
          if (actions?.onToggleQueue) {
            actions.onToggleQueue()
          } else if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('audiobookphile:toggle-queue'))
          }
          break
        case 'Shift-KeyS':
          if (actions?.onToggleSleepTimer) {
            actions.onToggleSleepTimer()
          } else if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('audiobookphile:toggle-sleeptimer'))
          }
          break
        case 'KeyS':
          if (state.sleepTimerRemaining !== null) {
            controls.extendSleepTimer(300)
          } else {
            const duration = state.settings.defaultSleepTimerDuration || 900
            controls.startSleepTimer(duration === -1 ? 900 : duration)
          }
          break
        case 'Shift-Slash':
        case 'Slash':
          if (e.key === '?' || (e.shiftKey && e.code === 'Slash')) {
            if (actions?.onToggleShortcuts) {
              actions.onToggleShortcuts()
            } else if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('audiobookphile:toggle-shortcuts'))
            }
            break
          }
          return
        case 'Escape':
          onClose()
          break
        default:
          return // Don't preventDefault for unhandled keys
      }

      e.preventDefault()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, state.volume, state.sleepTimerRemaining, state.settings.defaultSleepTimerDuration, controls, onClose, actions])
}
