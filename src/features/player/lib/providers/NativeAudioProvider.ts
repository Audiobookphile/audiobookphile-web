import type { AudioTrack } from '../AudioTrack'
import { IAudioProvider } from '../types'

export class NativeAudioProvider implements IAudioProvider {
  constructor(
    private player: HTMLAudioElement,
    private audioTracks: AudioTrack[],
    private startTime: number,
    private onTrackLoad: (trackStartTime: number) => void
  ) {}

  private currentTrackIndex = 0

  load(): void {
    const trackIndex = this.audioTracks.findIndex((track) => track.containsTime(this.startTime))
    this.currentTrackIndex = trackIndex >= 0 ? trackIndex : 0
    this.loadCurrentTrack()
  }

  private get currentTrack(): AudioTrack | null {
    return this.audioTracks[this.currentTrackIndex] ?? null
  }

  private loadCurrentTrack(): void {
    const track = this.currentTrack
    if (!track) return

    const trackStartTime = Math.max(0, this.startTime - track.startOffset)
    this.onTrackLoad(trackStartTime)

    this.player.src = track.relativeContentUrl
    this.player.load()
  }

  seek(time: number): void {
    if (!this.audioTracks.length) return

    const lastTrack = this.audioTracks[this.audioTracks.length - 1]
    const totalDuration = lastTrack.startOffset + lastTrack.duration
    const clampedTime = Math.max(0, Math.min(time, totalDuration > 0 ? totalDuration : time))

    // Find the track that contains clampedTime
    let trackIndex = this.audioTracks.findIndex((t) => t.containsTime(clampedTime))
    if (trackIndex === -1) {
      trackIndex = this.audioTracks.length - 1
    }

    if (trackIndex === this.currentTrackIndex && this.player.src) {
      const track = this.audioTracks[trackIndex]
      const maxTrackTime = track.duration > 0 ? track.duration : Infinity
      const offsetTime = Math.max(0, Math.min(clampedTime - track.startOffset, maxTrackTime))
      this.player.currentTime = offsetTime
      this.onTrackLoad(offsetTime)
    } else {
      this.startTime = clampedTime
      this.currentTrackIndex = trackIndex
      this.loadCurrentTrack()
    }
  }

  getCurrentTrackIndex(): number {
    return this.currentTrackIndex
  }

  nextTrack(): boolean {
    if (this.currentTrackIndex < this.audioTracks.length - 1) {
      this.currentTrackIndex++
      this.startTime = 0
      this.loadCurrentTrack()
      return true
    }
    return false
  }

  destroy(): void {
    this.player.removeAttribute('src')
    this.player.load()
  }
}
