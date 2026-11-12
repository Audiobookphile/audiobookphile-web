import type { AudioTrackData } from '@/types/api'

/**
 * Represents an audio track with session-aware URLs
 */
export class AudioTrack {
  readonly index: number
  readonly startOffset: number
  readonly duration: number
  readonly title: string
  readonly contentUrl: string
  readonly mimeType: string
  readonly metadata: Record<string, unknown>

  private readonly sessionTrackUrl: string

  constructor(track: AudioTrackData, sessionId?: string) {
    this.index = track.index ?? 0
    this.startOffset = track.startOffset ?? 0
    this.duration = track.duration ?? 0
    this.title = track.title ?? ''
    this.contentUrl = track.contentUrl ?? ''
    this.mimeType = track.mimeType ?? ''
    this.metadata = track.metadata ?? {}

    // If the contentUrl is an absolute URL (e.g. Supabase signed URL) or an HLS path,
    // use it directly. Only build the ABS session track URL for relative paths.
    if (this.contentUrl?.startsWith('http') || this.contentUrl?.startsWith('/hls') || !sessionId) {
      this.sessionTrackUrl = this.contentUrl
    } else {
      this.sessionTrackUrl = `/public/session/${sessionId}/track/${this.index}`
    }
  }

  /**
   * Full URL for external players (e.g., Chromecast)
   */
  get fullContentUrl(): string {
    return `${window.location.origin}${this.sessionTrackUrl}`
  }

  /**
   * Relative URL for local player
   */
  get relativeContentUrl(): string {
    return this.sessionTrackUrl
  }

  /**
   * Check if a given time falls within this track
   */
  containsTime(time: number): boolean {
    return time >= this.startOffset && time <= this.startOffset + this.duration
  }
}
