import { MediaProgress } from '.'
import { AudioBookmark, PlaybackSession } from './models'

export interface UserPermissions {
  download: boolean
  update: boolean
  delete: boolean
  upload: boolean
  createEreader: boolean
  accessAllLibraries: boolean
  accessAllTags: boolean
  accessExplicitContent: boolean
  /** Whether tags are deny list (true) or allow list (false) */
  selectedTagsNotAccessible: boolean
}

export interface User {
  id: string
  username: string
  email?: string
  type: 'root' | 'admin' | 'user' | 'guest'
  /** Legacy non-expiring token (empty string for root users when hidden) */
  token: string
  isOldToken?: boolean
  mediaProgress: MediaProgress[]
  /** Series IDs to hide from continue listening */
  seriesHideFromContinueListening: string[]
  bookmarks: AudioBookmark[]
  isActive: boolean
  isLocked: boolean
  /** null if never seen */
  lastSeen?: number
  createdAt: number
  permissions: UserPermissions
  /** Library IDs accessible to user (empty if accessAllLibraries is true) */
  librariesAccessible: string[]
  /** Tags selected/filtered for user (empty if accessAllTags is true) */
  itemTagsAccessible: string[]
  /** Alias for backward compatibility */
  itemTagsSelected?: string[]
  hasOpenIDLink: boolean
  /** Latest playback session (included when include=latestSession) */
  latestSession?: PlaybackSession
}

export interface ApiKey {
  createdAt: string
  createdByUser: {
    id: string
    username: string
    type: string
  }
  createdByUserId: string
  description: string | null
  expiresAt: string | null // e.g. 2026-01-23T00:56:47.402Z
  id: string
  isActive: boolean
  lastUsedAt: string | null
  name: string
  updatedAt: string
  user: {
    id: string
    username: string
    type: string
  }
  userId: string
  apiKey?: string // Only returned when creating a new API key
}

export enum AuthMethod {
  LOCAL = 'local',
  OPENID = 'openid',
}
