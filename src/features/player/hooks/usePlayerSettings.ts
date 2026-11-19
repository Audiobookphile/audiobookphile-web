import { useCallback, useEffect, useRef, useState } from 'react'
import type { EqualizerPreset } from '@/features/player/lib/AudioEqualizer'

export interface PlayerSettings {
  /** Track shows chapter instead of full duration */
  useChapterTrack: boolean
  /** Seconds to jump forward */
  jumpForwardAmount: number
  /** Seconds to jump backward */
  jumpBackwardAmount: number
  /** Current playback rate (e.g., 1.0, 1.5, 2.0) */
  playbackRate: number
  /** Increment/decrement amount for playback rate changes (0.1 or 0.05) */
  playbackRateIncrementDecrement: 0.1 | 0.05
  /** Current volume level (0-1) */
  volume: number
  /** Audio equalizer preset for vocal clarity */
  equalizerPreset: EqualizerPreset
  /** Volume boost multiplier (1.0 = 100% normal, up to 2.0 = 200% / +6dB boost) */
  volumeBoost?: number
  /** Default sleep timer duration in seconds (e.g. 900 for 15m, 1800 for 30m, -1 for end of chapter) */
  defaultSleepTimerDuration: number
}

export interface UsePlayerSettingsReturn {
  settings: PlayerSettings
  setUseChapterTrack: (value: boolean) => void
  setJumpForwardAmount: (value: number) => void
  setJumpBackwardAmount: (value: number) => void
  setPlaybackRate: (value: number) => void
  setPlaybackRateIncrementDecrement: (value: 0.1 | 0.05) => void
  setEqualizerPreset: (value: EqualizerPreset) => void
  setVolumeBoost: (value: number) => void
  setDefaultSleepTimerDuration: (value: number) => void
  /** Update multiple settings at once */
  updateSettings: (updates: Partial<PlayerSettings>) => void
  /** Increment playback rate by the configured increment amount */
  incrementPlaybackRate: () => number
  /** Decrement playback rate by the configured decrement amount */
  decrementPlaybackRate: () => number
  /** Set volume level (0-1) */
  setVolume: (value: number) => void
  /** Toggle mute on/off. Returns the new volume. */
  toggleMute: () => number
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'absPlayerSettings'

const DEFAULT_SETTINGS: PlayerSettings = {
  useChapterTrack: false,
  jumpForwardAmount: 10,
  jumpBackwardAmount: 10,
  playbackRate: 1.0,
  playbackRateIncrementDecrement: 0.1,
  volume: 0.5,
  equalizerPreset: 'off',
  volumeBoost: 1.0,
  defaultSleepTimerDuration: 900,
}

// Playback rate bounds
const MIN_PLAYBACK_RATE = 0.5
const MAX_PLAYBACK_RATE = 10.0

// ============================================================================
// Helper Functions
// ============================================================================

function loadSettingsFromStorage(): PlayerSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return DEFAULT_SETTINGS
    }

    const parsed = JSON.parse(stored) as Partial<PlayerSettings>

    // Merge with defaults to ensure all fields exist
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      // Ensure playbackRateIncrementDecrement is valid
      playbackRateIncrementDecrement:
        parsed.playbackRateIncrementDecrement === 0.05 || parsed.playbackRateIncrementDecrement === 0.1
          ? parsed.playbackRateIncrementDecrement
          : DEFAULT_SETTINGS.playbackRateIncrementDecrement,
    }
  } catch (error) {
    console.error('[usePlayerSettings] Failed to load settings from localStorage:', error)
    return DEFAULT_SETTINGS
  }
}

function saveSettingsToStorage(settings: PlayerSettings): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (error) {
    console.error('[usePlayerSettings] Failed to save settings to localStorage:', error)
  }
}

/**
 * Clamp playback rate to valid bounds and round to avoid floating point issues
 */
function clampPlaybackRate(rate: number): number {
  const clamped = Math.max(MIN_PLAYBACK_RATE, Math.min(MAX_PLAYBACK_RATE, rate))
  // Round to 2 decimal places to avoid floating point issues
  return Math.round(clamped * 100) / 100
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook that manages player settings persisted in local storage.
 * Settings include playback rate, jump amounts, chapter track mode, etc.
 */
export function usePlayerSettings(): UsePlayerSettingsReturn {
  const [settings, setSettings] = useState<PlayerSettings>(DEFAULT_SETTINGS)
  const [isInitialized, setIsInitialized] = useState(false)

  // Track volume before mute (for toggling mute to keep the same volume)
  const lastVolumeBeforeMuteRef = useRef<number | null>(null)

  // Load settings from localStorage on mount (client-side only)
  useEffect(() => {
    const loaded = loadSettingsFromStorage()
    setSettings(loaded)
    setIsInitialized(true)
  }, [])

  // Save settings to localStorage whenever they change (after initial load)
  useEffect(() => {
    if (isInitialized) {
      saveSettingsToStorage(settings)
    }
  }, [settings, isInitialized])

  const updateSettings = useCallback((updates: Partial<PlayerSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...updates,
    }))
  }, [])

  const setUseChapterTrack = useCallback((value: boolean) => {
    setSettings((prev) => ({ ...prev, useChapterTrack: value }))
  }, [])

  const setJumpForwardAmount = useCallback((value: number) => {
    setSettings((prev) => ({ ...prev, jumpForwardAmount: value }))
  }, [])

  const setJumpBackwardAmount = useCallback((value: number) => {
    setSettings((prev) => ({ ...prev, jumpBackwardAmount: value }))
  }, [])

  const setPlaybackRate = useCallback((value: number) => {
    setSettings((prev) => ({ ...prev, playbackRate: clampPlaybackRate(value) }))
  }, [])

  const setPlaybackRateIncrementDecrement = useCallback((value: 0.1 | 0.05) => {
    setSettings((prev) => ({ ...prev, playbackRateIncrementDecrement: value }))
  }, [])

  const incrementPlaybackRate = useCallback((): number => {
    let newRate: number = settings.playbackRate
    setSettings((prev) => {
      newRate = clampPlaybackRate(prev.playbackRate + prev.playbackRateIncrementDecrement)
      return { ...prev, playbackRate: newRate }
    })
    return newRate
  }, [settings.playbackRate])

  const decrementPlaybackRate = useCallback((): number => {
    let newRate: number = settings.playbackRate
    setSettings((prev) => {
      newRate = clampPlaybackRate(prev.playbackRate - prev.playbackRateIncrementDecrement)
      return { ...prev, playbackRate: newRate }
    })
    return newRate
  }, [settings.playbackRate])

  const setVolume = useCallback((value: number) => {
    const clampedVolume = Math.max(0, Math.min(1, value))
    setSettings((prev) => ({ ...prev, volume: clampedVolume }))
  }, [])

  const setEqualizerPreset = useCallback((value: EqualizerPreset) => {
    setSettings((prev) => ({ ...prev, equalizerPreset: value }))
  }, [])

  const setVolumeBoost = useCallback((value: number) => {
    setSettings((prev) => ({ ...prev, volumeBoost: value }))
  }, [])

  const setDefaultSleepTimerDuration = useCallback((value: number) => {
    setSettings((prev) => ({ ...prev, defaultSleepTimerDuration: value }))
  }, [])

  const toggleMute = useCallback((): number => {
    const currentVolume = settings.volume
    if (currentVolume > 0) {
      // Muting: set to 0
      lastVolumeBeforeMuteRef.current = currentVolume
      setSettings((prev) => ({ ...prev, volume: 0 }))
      return 0
    } else {
      // Unmuting: restore previous volume or default to 0.5
      const restoredVolume = lastVolumeBeforeMuteRef.current ?? 0.5
      lastVolumeBeforeMuteRef.current = null
      setSettings((prev) => ({ ...prev, volume: restoredVolume }))
      return restoredVolume
    }
  }, [settings.volume])

  return {
    settings,
    setUseChapterTrack,
    setJumpForwardAmount,
    setJumpBackwardAmount,
    setPlaybackRate,
    setPlaybackRateIncrementDecrement,
    setEqualizerPreset,
    setVolumeBoost,
    setDefaultSleepTimerDuration,
    updateSettings,
    incrementPlaybackRate,
    decrementPlaybackRate,
    setVolume,
    toggleMute,
  }
}
