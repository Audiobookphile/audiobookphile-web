import { PlayerState } from '@/types/api'

export type PlayerEventMap = {
  stateChange: PlayerState
  timeupdate: number
  buffertimeUpdate: number
  durationChange: number
  error: Error
  finished: void
}

export type PlayerEventCallback<K extends keyof PlayerEventMap> = (data: PlayerEventMap[K]) => void

export interface IAudioProvider {
  load(): void
  destroy(): void
  seek(time: number): void
  getCurrentTrackIndex(): number
  nextTrack(): boolean
}
