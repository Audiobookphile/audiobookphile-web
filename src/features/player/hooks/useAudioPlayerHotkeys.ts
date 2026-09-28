import { useEffect } from 'react'
import type { PlayerHandlerControls, PlayerHandlerState } from '@/features/player/hooks/usePlayerHandler'
import { VOLUME_HOTKEY_STEP } from '@/features/player/lib/constants'
import { shouldDeferToFocusedElement } from '@/features/player/lib/hotkeyScope'

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
  onClose: () => void
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
        case 'Shift-ArrowUp':
          controls.incrementPlaybackRate()
          break
        case 'Shift-ArrowDown':
          controls.decrementPlaybackRate()
          break
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
  }, [enabled, state.volume, controls, onClose])
}
