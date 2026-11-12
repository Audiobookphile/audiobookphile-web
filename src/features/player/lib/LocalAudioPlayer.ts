import type { LibraryItem } from '@/types/api'
import { PlayerState } from '@/types/api'
import type { AudioTrack } from './AudioTrack'
import { AUDIO_MIME_TYPES } from './constants'
import { PlayerEventEmitter } from './PlayerEventEmitter'
import { NativeAudioProvider } from './providers/NativeAudioProvider'
import type { IAudioProvider } from './types'

export class LocalAudioPlayer extends PlayerEventEmitter {
  private player: HTMLAudioElement | null = null
  private provider: IAudioProvider | null = null

  // Track state
  private libraryItem: LibraryItem | null = null
  private audioTracks: AudioTrack[] = []
  private isHlsTranscode = false
  private startTime = 0
  private trackStartTime = 0
  private playWhenReady = false

  // The provider generation.
  //
  // The HLS provider is loaded on demand, so `set()` can finish before the
  // provider exists. The generation says which `set()` a provider that
  // arrives belongs to: a chunk that lands after the track changed belongs
  // to a track that is no longer playing.
  private providerGeneration = 0

  /**
   * A seek that arrived before the provider was ready to take it.
   *
   * The HLS provider is a chunk fetch away, and a seek in that window used
   * to be dropped. It is kept here and applied when the provider lands.
   */
  private pendingSeek: { time: number; playWhenReady: boolean } | null = null

  // Monotonic Seek Transaction Epochs
  private activeSeekEpoch = 0
  private acknowledgedSeekEpoch = 0
  private optimisticSeekTime: number | null = null

  readonly playableMimeTypes: string[] = []

  constructor() {
    super()
    this.initialize()
  }

  private get currentTrack(): AudioTrack | null {
    const index = this.provider?.getCurrentTrackIndex() ?? 0
    return this.audioTracks[index] ?? null
  }

  private initialize(): void {
    const existing = document.getElementById('audio-player')
    if (existing) {
      existing.remove()
    }

    const audioEl = document.createElement('audio')
    audioEl.id = 'audio-player'
    audioEl.style.display = 'none'
    audioEl.preload = 'metadata'
    audioEl.crossOrigin = 'anonymous'
    document.body.appendChild(audioEl)
    this.player = audioEl

    this.player.addEventListener('play', this.handlePlay)
    this.player.addEventListener('pause', this.handlePause)
    this.player.addEventListener('progress', this.handleProgress)
    this.player.addEventListener('ended', this.handleEnded)
    this.player.addEventListener('error', this.handleError)
    this.player.addEventListener('loadedmetadata', this.handleLoadedMetadata)
    this.player.addEventListener('timeupdate', this.handleTimeUpdate)

    for (const mimeType of AUDIO_MIME_TYPES) {
      const canPlay = this.player.canPlayType(mimeType)
      if (canPlay) {
        this.playableMimeTypes.push(mimeType)
      }
    }
  }

  private handlePlay = (): void => {
    this.emit('stateChange', PlayerState.PLAYING)
  }

  private handlePause = (): void => {
    this.emit('stateChange', PlayerState.PAUSED)
  }

  private handleProgress = (): void => {
    const lastBufferTime = this.getLastBufferedTime()
    this.emit('buffertimeUpdate', lastBufferTime)
  }

  private handleEnded = (): void => {
    if (this.provider?.nextTrack()) {
      // Next track is loading — ensure it auto-plays when metadata is ready
      this.playWhenReady = true
    } else {
      this.emit('stateChange', PlayerState.FINISHED)
      this.emit('finished', undefined)
    }
  }

  private retryCount = 0
  private recoveryTimer: ReturnType<typeof setTimeout> | null = null
  private recoveryGeneration = 0

  private cancelRecovery(): void {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer)
      this.recoveryTimer = null
    }
    this.recoveryGeneration++
  }

  private handleError = (event: Event): void => {
    console.warn('[LocalAudioPlayer] Audio playback warning/error:', event)
    // Attempt automatic recovery up to 3 times before declaring a fatal error
    if (this.retryCount < 3 && this.player && this.currentTrack) {
      this.retryCount++
      const resumeTime = this.getCurrentTime()
      this.cancelRecovery()
      const currentGen = this.recoveryGeneration
      const activeProvider = this.provider
      this.recoveryTimer = setTimeout(() => {
        if (this.player && this.provider === activeProvider && this.recoveryGeneration === currentGen) {
          this.seek(resumeTime, true)
        }
      }, 500)
      return
    }

    this.cancelRecovery()
    this.retryCount = 0
    const error = new Error('Audio playback error')
    console.error('[LocalAudioPlayer] Fatal Error:', event)
    this.emit('stateChange', PlayerState.ERROR)
    this.emit('error', error)
  }

  private handleLoadedMetadata = (): void => {
    this.cancelRecovery()
    this.retryCount = 0

    if (!this.isHlsTranscode && this.player) {
      this.player.currentTime = this.trackStartTime
    }

    this.emit('stateChange', PlayerState.LOADED)
    this.emit('durationChange', this.getDuration())

    if (this.playWhenReady) {
      this.playWhenReady = false
      this.play()
    }
  }

  private handleTimeUpdate = (): void => {
    if (this.activeSeekEpoch !== this.acknowledgedSeekEpoch) {
      return
    }
    this.emit('timeupdate', this.getCurrentTime())
  }

  private handleTrackLoad = (trackStartTime: number) => {
    this.trackStartTime = trackStartTime
  }

  set(
    libraryItem: LibraryItem | null,
    tracks: AudioTrack[],
    isHlsTranscode: boolean,
    startTime: number,
    playWhenReady = false
  ): void {
    this.cancelRecovery()
    this.retryCount = 0
    this.libraryItem = libraryItem
    this.audioTracks = tracks
    this.isHlsTranscode = isHlsTranscode
    this.playWhenReady = playWhenReady
    this.startTime = startTime

    if (this.provider) {
      this.provider.destroy()
      this.provider = null
    }

    if (!this.player) return

    // The HLS provider is loaded on demand.
    //
    // hls.js is 176 KB gzipped -- a twelfth of the whole client budget --
    // and it is only ever needed for a transcoded stream. A static import
    // put it in the app shell's chunk graph, so every authenticated page
    // shipped it to every visitor, to play a stream most of them never
    // play.
    //
    // The provider's own code is unchanged: it is the same class, the same
    // options and the same events. Only the moment it is created moves.
    const generation = ++this.providerGeneration

    if (this.isHlsTranscode) {
      const player = this.player
      void import('./providers/HlsAudioProvider').then(({ HlsAudioProvider }) => {
        // The track changed, or the player was torn down, while the chunk
        // was in flight.
        if (generation !== this.providerGeneration || this.player !== player) return
        this.provider = new HlsAudioProvider(player, this.audioTracks, this.startTime, this.handleTrackLoad)
        this.provider.load()
        this.applyPendingSeek()
      })
      return
    }

    this.provider = new NativeAudioProvider(this.player, this.audioTracks, this.startTime, this.handleTrackLoad)
    this.provider.load()
    this.applyPendingSeek()
  }

  /**
   * Apply a seek that arrived before the provider was ready.
   */
  private applyPendingSeek(): void {
    const pending = this.pendingSeek
    if (!pending || !this.provider) return
    this.pendingSeek = null
    this.seek(pending.time, pending.playWhenReady)
  }

  destroy(): void {
    this.cancelRecovery()
    this.retryCount = 0
    // Any provider still in flight belongs to a player that no longer
    // exists, and any seek it was going to take went with it.
    this.providerGeneration++
    this.pendingSeek = null

    if (this.provider) {
      this.provider.destroy()
      this.provider = null
    }

    if (this.player) {
      this.player.removeEventListener('play', this.handlePlay)
      this.player.removeEventListener('pause', this.handlePause)
      this.player.removeEventListener('progress', this.handleProgress)
      this.player.removeEventListener('ended', this.handleEnded)
      this.player.removeEventListener('error', this.handleError)
      this.player.removeEventListener('loadedmetadata', this.handleLoadedMetadata)
      this.player.removeEventListener('timeupdate', this.handleTimeUpdate)
      this.player.remove()
      this.player = null
    }

    this.clearListeners()
    this.audioTracks = []
    this.libraryItem = null
  }

  async resetStream(startTime: number): Promise<void> {
    if (this.provider) {
      this.provider.destroy()
      this.provider = null
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))

    if (this.libraryItem) {
      this.set(this.libraryItem, this.audioTracks, this.isHlsTranscode, startTime, true)
    }
  }

  playPause(): void {
    if (!this.player) return
    if (this.player.paused) {
      this.play()
    } else {
      this.pause()
    }
  }

  play(): void {
    this.playWhenReady = true
    void this.player?.play()
  }

  pause(): void {
    this.playWhenReady = false
    this.player?.pause()
  }

  getCurrentTime(): number {
    if (this.optimisticSeekTime !== null && this.activeSeekEpoch !== this.acknowledgedSeekEpoch) {
      return this.optimisticSeekTime
    }
    const track = this.currentTrack
    if (!track || !this.player) return 0
    const playerTime = !isNaN(this.player.currentTime) ? this.player.currentTime : 0
    return track.startOffset + (playerTime > 0 ? playerTime : this.trackStartTime)
  }

  getDuration(): number {
    if (!this.audioTracks.length) return 0
    const lastTrack = this.audioTracks[this.audioTracks.length - 1]
    const sumDuration = lastTrack.startOffset + lastTrack.duration
    if (sumDuration === 0 && this.player && !isNaN(this.player.duration) && this.player.duration !== Infinity) {
      return this.player.duration
    }
    return sumDuration
  }

  setPlaybackRate(rate: number): void {
    if (this.player) {
      this.player.playbackRate = rate
    }
  }

  setVolume(volume: number): void {
    if (this.player) {
      this.player.volume = volume
    }
  }

  seek(time: number, playWhenReady: boolean): void {
    if (!this.player) return

    if (!this.provider) {
      // The provider has not arrived yet -- the HLS chunk is still in
      // flight. The seek is kept and applied the moment it lands, rather
      // than dropped on the floor.
      this.pendingSeek = { time, playWhenReady }
      return
    }
    this.activeSeekEpoch++
    const thisEpoch = this.activeSeekEpoch
    this.optimisticSeekTime = time

    this.playWhenReady = playWhenReady
    const prevTrackIndex = this.provider.getCurrentTrackIndex()
    this.provider.seek(time)
    const newTrackIndex = this.provider.getCurrentTrackIndex()

    if (prevTrackIndex === newTrackIndex && playWhenReady && this.player.paused) {
      this.play()
    }

    setTimeout(() => {
      if (this.activeSeekEpoch === thisEpoch) {
        this.acknowledgedSeekEpoch = thisEpoch
        this.optimisticSeekTime = null
      }
    }, 200)
  }

  private isValidDuration(duration: number): boolean {
    return duration != null && !isNaN(duration) && duration !== Infinity && duration !== -Infinity
  }

  private getBufferedRanges(): Array<{ start: number; end: number }> {
    if (!this.player) return []

    const ranges: Array<{ start: number; end: number }> = []
    const buffered = this.player.buffered

    for (let i = 0; i < buffered.length; i++) {
      let start = buffered.start(i)
      const end = buffered.end(i)

      if (!this.isValidDuration(start)) start = 0
      if (!this.isValidDuration(end)) continue

      ranges.push({ start, end })
    }

    return ranges
  }

  private getLastBufferedTime(): number {
    const ranges = this.getBufferedRanges()
    if (!ranges.length || !this.player) return 0

    const currentRange = ranges.find((r) => r.start < this.player!.currentTime && r.end > this.player!.currentTime)
    if (currentRange) return currentRange.end

    return ranges[ranges.length - 1].end
  }
}
