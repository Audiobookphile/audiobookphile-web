import { useCallback, useEffect, useRef, useState } from 'react'
import { usePlaybackSession } from '@/features/player/hooks/usePlaybackSession'
import { closePlaybackSession } from '@/features/player/actions/playbackActions'
import { isStaleSessionResponse } from '@/features/player/lib/sessionFreshness'
import {
  type PlayerSettings,
  type UsePlayerSettingsReturn,
  usePlayerSettings,
} from '@/features/player/hooks/usePlayerSettings'
import { AudioTrack } from '@/features/player/lib/AudioTrack'
import { LocalAudioPlayer } from '@/features/player/lib/LocalAudioPlayer'
import { useGlobalToast } from '@/shared/contexts/ToastContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import type { Chapter, LibraryItem, PlaybackSession, PlayMethod } from '@/types/api'
import { PlayerState } from '@/types/api'

export interface PlayerHandlerState {
  /** Current player state */
  playerState: PlayerState
  /** Current playback time in seconds */
  currentTime: number
  /** Total duration in seconds */
  duration: number
  /** Buffered time in seconds */
  bufferedTime: number
  /** Current volume (0-1) */
  volume: number
  /** Whether using HLS transcode */
  isHlsTranscode: boolean
  /** Current play method */
  playMethod: PlayMethod | null
  /** Active session ID */
  sessionId: string | null
  /** Display title from session */
  displayTitle: string | null
  /** Display author from session */
  displayAuthor: string | null
  /** Current chapters */
  chapters: Chapter[]
  /** Current chapter */
  currentChapter: Chapter | null
  /** Next chapter */
  nextChapter: Chapter | null
  /** Previous chapter */
  previousChapter: Chapter | null
  /** Player settings (persisted in local storage) */
  settings: PlayerSettings
  /** Remaining time in seconds for the sleep timer, null if inactive */
  sleepTimerRemaining: number | null
}

export interface PlayerHandlerControls {
  /** Load and start playing a library item */
  load: (libraryItem: LibraryItem, episodeId?: string | null, startTimeOverride?: number) => Promise<void>
  /** Play */
  play: () => void
  /** Pause */
  pause: () => void
  /** Toggle play/pause */
  playPause: () => void
  /** Seek to a specific time */
  seek: (time: number) => void
  /** Jump forward by configured amount */
  jumpForward: () => void
  /** Jump backward by configured amount */
  jumpBackward: () => void
  /** Set volume (0-1) */
  setVolume: (volume: number) => void
  /** Toggle mute on/off */
  toggleMute: () => void
  /** Set playback rate */
  setPlaybackRate: (rate: number) => void
  /** Increment playback rate by configured amount */
  incrementPlaybackRate: () => void
  /** Decrement playback rate by configured amount */
  decrementPlaybackRate: () => void
  /** Update player settings */
  updateSettings: UsePlayerSettingsReturn['updateSettings']
  /** Close the player and end session */
  closePlayer: () => Promise<void>
  /** Start a sleep timer with the given duration in seconds */
  startSleepTimer: (duration: number) => void
  /** Cancel the active sleep timer */
  stopSleepTimer: () => void
}

export interface UsePlayerHandlerReturn {
  state: PlayerHandlerState
  controls: PlayerHandlerControls
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook that manages the audio player and playback sessions.
 * This is the main orchestrator for audio playback - it instantiates
 * the LocalAudioPlayer and coordinates with the server for session management.
 */
export function usePlayerHandler(): UsePlayerHandlerReturn {
  // Player settings (persisted in local storage)
  const playerSettings = usePlayerSettings()
  const { settings } = playerSettings
  const { showToast } = useGlobalToast()
  const t = useTypeSafeTranslations()

  // NOTE: this hook used to keep a `closePlayerRef` so that setupPlayerListeners
  // — declared before the controls, and so unable to reference them without
  // hitting their temporal dead zone — could tear the player down from the
  // `error` and `finished` handlers. Neither handler does that any more: terminal
  // teardown belongs to MediaPlayerContainer, which also has to clear the stream
  // state and so cannot be done from in here. The ref was therefore a write-only
  // local, and it is gone rather than left as a decoy for the next reader.

  // Player state
  const [playerState, setPlayerState] = useState<PlayerState>(PlayerState.IDLE)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [bufferedTime, setBufferedTime] = useState(0)
  const [isHlsTranscode, setIsHlsTranscode] = useState(false)
  const [playMethod, setPlayMethod] = useState<PlayMethod | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [displayTitle, setDisplayTitle] = useState<string | null>(null)
  const [displayAuthor, setDisplayAuthor] = useState<string | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null)

  // Refs
  const playerRef = useRef<LocalAudioPlayer | null>(null)
  const audioTracksRef = useRef<AudioTrack[]>([])
  const libraryItemRef = useRef<LibraryItem | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  // Refs for values needed in callbacks (to avoid stale closures)
  const playbackRateRef = useRef(settings.playbackRate)
  playbackRateRef.current = settings.playbackRate

  const volumeRef = useRef(settings.volume)
  volumeRef.current = settings.volume

  const currentChapter = chapters.find((chapter) => chapter.start <= currentTime && chapter.end > currentTime) ?? null
  const nextChapter = chapters.find((chapter) => chapter.start > currentTime && chapter.end > currentTime) ?? null
  const previousChapter =
    chapters.findLast((chapter) => chapter.end <= currentTime && chapter.start < currentTime) ?? null

  // ============================================================================
  // Session Management
  // ============================================================================

  const handleSessionReady = useCallback(
    (session: PlaybackSession, audioTracks: AudioTrack[], hlsTranscode: boolean) => {
      // Stale-response guard. `load` is async and the session start is a network
      // round trip, so two rapid Play presses can be in flight at once: A is
      // loading, the user presses Play on B, `libraryItemRef` becomes B, and then
      // A's session response arrives. The old code took the item from
      // `libraryItemRef.current` (now B) and the tracks from the response (A's),
      // then called `set(itemB, tracksA)`. The bar showed B's title and cover
      // while playing A's audio, progress synced against B, and B's saved
      // position never advanced. See isStaleSessionResponse.
      const currentItem = libraryItemRef.current
      if (isStaleSessionResponse(session.libraryItemId, currentItem?.id)) {
        console.warn(
          `[usePlayerHandler] discarding stale session ${session.id} for ${session.libraryItemId}; ` +
            `now playing ${currentItem?.id}`
        )
        // Close it rather than dropping it on the floor. This is why the stale
        // session's id must be recorded here and nowhere else: `load` only closes
        // the previous session when it knows its id, and a session that is never
        // adopted is never known, so ignoring it without closing would leak an
        // open server session per superseded Play press.
        void closePlaybackSession(session.id, null).catch(() => {
          // Best effort: the session may already have been closed, and a failure
          // here must not surface to the user mid-playback.
        })
        return
      }

      setSessionId(session.id)
      sessionIdRef.current = session.id
      setDisplayTitle(session.displayTitle)
      setDisplayAuthor(session.displayAuthor)
      setChapters(
        (session.chapters ?? []).map((chapter) => {
          const start = parseFloat((chapter.start ?? 0).toFixed(6))
          const end = parseFloat((chapter.end ?? 0).toFixed(6))
          return {
            ...chapter,
            start,
            end,
          }
        })
      )
      setPlayMethod(session.playMethod)
      setIsHlsTranscode(hlsTranscode)
      setDuration(session.duration)

      audioTracksRef.current = audioTracks

      // Start playback
      const item = libraryItemRef.current
      if (playerRef.current && item) {
        playerRef.current.set(item, audioTracks, hlsTranscode, session.currentTime, true)
      }
    },
    []
  )

  const handleSessionError = useCallback(
    (error: Error) => {
      console.error('[usePlayerHandler] Session error:', error)
      setPlayerState(PlayerState.ERROR)
      // Previously silent: the player sat in ERROR with no explanation, so a
      // failed session looked like "press play, nothing happens". Surface the
      // backend's reason (missing files, auth, bad payload) as a toast — it is
      // also the fastest route to the true root cause from a bug report.
      const detail = error?.message?.trim()
      showToast(detail ? `${t('ToastPlaybackFailed')}: ${detail}` : t('ToastPlaybackFailed'), {
        type: 'error',
        duration: 8000,
      })
    },
    [showToast, t]
  )

  const { startSession, closeSession, startSyncInterval, stopSyncInterval } = usePlaybackSession({
    onSessionReady: handleSessionReady,
    onError: handleSessionError,
  })

  // ============================================================================
  // Player Setup
  // ============================================================================

  const setupPlayerListeners = useCallback(
    (player: LocalAudioPlayer) => {
      player.on('stateChange', (state) => {
        setPlayerState(state)

        if (state === PlayerState.PLAYING) {
          // Start sync interval when playing
          startSyncInterval(
            () => playerRef.current?.getCurrentTime() ?? 0,
            () => playerRef.current?.getDuration() ?? 0
          )
          // Apply playback rate and volume from refs to avoid stale closures
          player.setPlaybackRate(playbackRateRef.current)
          player.setVolume(volumeRef.current)
        } else {
          stopSyncInterval()
        }

        // Update current time on state changes
        if (state !== PlayerState.LOADING) {
          setCurrentTime(player.getCurrentTime())
        }

        // Update duration when loaded
        if (state === PlayerState.LOADED || state === PlayerState.PLAYING) {
          setDuration(player.getDuration())
        }
      })

      player.on('timeupdate', (time) => {
        setCurrentTime(time)
      })

      player.on('buffertimeUpdate', (time) => {
        setBufferedTime(time)
      })

      player.on('durationChange', (dur) => {
        setDuration(dur)
      })

      player.on('error', (error) => {
        console.error('[usePlayerHandler] Player error:', error)
        // Fatal after LocalAudioPlayer's retry budget. Previously swallowed —
        // the UI had no ERROR rendering, leaving a silently dead player.
        showToast(t('ToastPlaybackFailed'), { type: 'error', duration: 6000 })
        // Deliberately NOT closePlayer() here. closePlayer() resets the state to
        // IDLE, which (a) erased the ERROR state in the same tick so the
        // container never saw it, and (b) left `streamLibraryItem` set, because
        // only clearStreamMedia() clears that. The bar therefore stayed on screen
        // showing the failed book with a Play button wired to a destroyed player:
        // tapping it ran playerRef.current?.playPause() on a null ref, so
        // nothing happened, with no toast and no error. Tearing down is the
        // container's decision, and it does both halves in the right order.
        setPlayerState(PlayerState.ERROR)
      })

      player.on('finished', () => {
        console.log('[usePlayerHandler] Playback finished')
        // Same reason as the error path: LocalAudioPlayer emits stateChange
        // (FINISHED) and finished back to back, so calling closePlayer() here
        // overwrote FINISHED with IDLE before React could commit an intermediate
        // render. MediaPlayerContainer's auto-advance effect gates on FINISHED,
        // so it could never fire and the queue never advanced. Leave the state
        // as FINISHED and let the container either advance or clear.
      })
    },
    [startSyncInterval, stopSyncInterval]
  )

  // Time update interval for smoother progress updates during playback
  useEffect(() => {
    if (playerState !== PlayerState.PLAYING) return

    const interval = setInterval(() => {
      if (playerRef.current) {
        setCurrentTime(playerRef.current.getCurrentTime())
      }
    }, 250) // Update 4 times per second for smooth UI

    return () => clearInterval(interval)
  }, [playerState])

  // Sleep timer interval
  useEffect(() => {
    if (sleepTimerRemaining === null) return

    const interval = setInterval(() => {
      setSleepTimerRemaining((prev) => {
        if (prev === null) return null
        if (prev <= 1) {
          playerRef.current?.pause()
          return null
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [sleepTimerRemaining])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
  }, [])

  // ============================================================================
  // Controls
  // ============================================================================

  const load = useCallback(
    async (libraryItem: LibraryItem, episodeId?: string | null, startTimeOverride?: number) => {
      // Close existing session if any (use ref to avoid stale closure)
      if (sessionIdRef.current) {
        stopSyncInterval()
        await closeSession(
          () => playerRef.current?.getCurrentTime() ?? 0,
          () => playerRef.current?.getDuration() ?? 0
        )
        sessionIdRef.current = null
      }

      // Store reference to library item
      libraryItemRef.current = libraryItem
      setPlayerState(PlayerState.LOADING)

      // Initialize player if needed
      if (!playerRef.current) {
        playerRef.current = new LocalAudioPlayer()
        setupPlayerListeners(playerRef.current)
      }

      // Start session - this will trigger handleSessionReady which starts playback
      await startSession(libraryItem, playerRef.current.playableMimeTypes, episodeId ?? undefined, startTimeOverride)
    },
    [closeSession, stopSyncInterval, setupPlayerListeners, startSession]
  )

  const play = useCallback(() => {
    playerRef.current?.play()
  }, [])

  const pause = useCallback(() => {
    playerRef.current?.pause()
  }, [])

  const playPause = useCallback(() => {
    playerRef.current?.playPause()
  }, [])

  const seek = useCallback(
    (time: number) => {
      if (!playerRef.current) return
      const isPlaying = playerState === PlayerState.PLAYING
      playerRef.current.seek(time, isPlaying)
      setCurrentTime(time)
    },
    [playerState]
  )

  const jumpForward = useCallback(() => {
    if (!playerRef.current || !duration) return
    const newTime = Math.min(currentTime + settings.jumpForwardAmount, duration)
    seek(newTime)
  }, [currentTime, duration, seek, settings.jumpForwardAmount])

  const jumpBackward = useCallback(() => {
    if (!playerRef.current) return
    const newTime = Math.max(currentTime - settings.jumpBackwardAmount, 0)
    seek(newTime)
  }, [currentTime, seek, settings.jumpBackwardAmount])

  const setVolume = useCallback(
    (vol: number) => {
      playerSettings.setVolume(vol)
      playerRef.current?.setVolume(vol)
    },
    [playerSettings]
  )

  const toggleMute = useCallback(() => {
    const newVolume = playerSettings.toggleMute()
    playerRef.current?.setVolume(newVolume)
  }, [playerSettings])

  const setPlaybackRate = useCallback(
    (rate: number) => {
      playerSettings.setPlaybackRate(rate)
      playerRef.current?.setPlaybackRate(rate)
    },
    [playerSettings]
  )

  const incrementPlaybackRate = useCallback(() => {
    const newRate = playerSettings.incrementPlaybackRate()
    playerRef.current?.setPlaybackRate(newRate)
  }, [playerSettings])

  const decrementPlaybackRate = useCallback(() => {
    const newRate = playerSettings.decrementPlaybackRate()
    playerRef.current?.setPlaybackRate(newRate)
  }, [playerSettings])

  // Synchronize MediaSession API for OS-level background playback resilience
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return

    if (!displayTitle) {
      navigator.mediaSession.metadata = null
      navigator.mediaSession.playbackState = 'none'
      const actions: MediaSessionAction[] = ['play', 'pause', 'stop', 'seekbackward', 'seekforward', 'seekto']
      actions.forEach((action) => {
        try {
          navigator.mediaSession.setActionHandler(action, null)
        } catch {}
      })
      return
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: displayTitle,
      artist: displayAuthor || 'Audiobookphile',
      album: currentChapter?.title || displayTitle,
    })

    navigator.mediaSession.setActionHandler('play', () => playerRef.current?.play())
    navigator.mediaSession.setActionHandler('pause', () => playerRef.current?.pause())
    navigator.mediaSession.setActionHandler('stop', () => playerRef.current?.pause())
    navigator.mediaSession.setActionHandler('seekbackward', () => jumpBackward())
    navigator.mediaSession.setActionHandler('seekforward', () => jumpForward())
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (typeof details.seekTime === 'number') {
        seek(details.seekTime)
      }
    })

    navigator.mediaSession.playbackState =
      playerState === PlayerState.PLAYING ? 'playing' : playerState === PlayerState.PAUSED ? 'paused' : 'none'

    if (duration > 0 && typeof navigator.mediaSession.setPositionState === 'function') {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, duration),
          playbackRate: Math.max(0.1, settings.playbackRate || 1),
          position: Math.min(Math.max(0, currentTime), duration),
        })
      } catch {
        // Ignore edge-case timestamp mismatch errors
      }
    }

    return () => {
      const actions: MediaSessionAction[] = ['play', 'pause', 'stop', 'seekbackward', 'seekforward', 'seekto']
      actions.forEach((action) => {
        try {
          navigator.mediaSession.setActionHandler(action, null)
        } catch {}
      })
    }
  }, [
    displayTitle,
    displayAuthor,
    currentChapter?.title,
    playerState,
    duration,
    currentTime,
    settings.playbackRate,
    jumpBackward,
    jumpForward,
    seek,
  ])

  const closePlayer = useCallback(async () => {
    stopSyncInterval()
    await closeSession(
      () => playerRef.current?.getCurrentTime() ?? 0,
      () => playerRef.current?.getDuration() ?? 0
    )

    // Destroy player
    if (playerRef.current) {
      playerRef.current.destroy()
      playerRef.current = null
    }

    // Reset state
    setPlayerState(PlayerState.IDLE)
    setCurrentTime(0)
    setDuration(0)
    setBufferedTime(0)
    setSessionId(null)
    sessionIdRef.current = null
    setDisplayTitle(null)
    setDisplayAuthor(null)
    setChapters([])
    setPlayMethod(null)
    setIsHlsTranscode(false)
    setSleepTimerRemaining(null)
    audioTracksRef.current = []
    libraryItemRef.current = null
  }, [closeSession, stopSyncInterval])

  const startSleepTimer = useCallback((duration: number) => {
    setSleepTimerRemaining(duration)
  }, [])

  const stopSleepTimer = useCallback(() => {
    setSleepTimerRemaining(null)
  }, [])

  return {
    state: {
      playerState,
      currentTime,
      duration,
      bufferedTime,
      volume: settings.volume,
      isHlsTranscode,
      playMethod,
      sessionId,
      displayTitle,
      displayAuthor,
      chapters,
      currentChapter,
      nextChapter,
      previousChapter,
      settings,
      sleepTimerRemaining,
    },
    controls: {
      load,
      play,
      pause,
      playPause,
      seek,
      jumpForward,
      jumpBackward,
      setVolume,
      toggleMute,
      setPlaybackRate,
      incrementPlaybackRate,
      decrementPlaybackRate,
      updateSettings: playerSettings.updateSettings,
      closePlayer,
      startSleepTimer,
      stopSleepTimer,
    },
  }
}
