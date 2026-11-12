import { LibraryItem } from '.'

export type EntityType = 'items' | 'series' | 'collections' | 'playlists' | 'authors'

export type PersonalizedShelfType = 'book' | 'podcast' | 'episode' | 'series' | 'authors'

export type MediaType<T extends LibraryItem> = T['mediaType']

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
  NOTE = 6,
}

export enum BookshelfView {
  STANDARD = 0, // Skeumorphic (original) design
  DETAIL = 1, // Modern default design
  AUTHOR = 2, // Books shown on author page
}

export enum PlayMethod {
  DIRECT_PLAY = 0,
  DIRECT_STREAM = 1,
  TRANSCODE = 2,
  LOCAL = 3,
}

export enum PlayerState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  LOADED = 'LOADED',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  FINISHED = 'FINISHED',
  ERROR = 'ERROR',
}
