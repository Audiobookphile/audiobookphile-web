import { AudibleRegion } from '@/shared/lib/providerUtils'
import { Author, Series } from '.'
import { StartSessionDeviceInfo } from './models'

/** Payload for the `author_removed` socket event (full author JSON or `{ id, libraryId }`). */
export interface AuthorRemovedPayload {
  id: string
  libraryId: string
}

/** Payload for the `item_removed` socket event. */
export interface LibraryItemRemovedPayload {
  id: string
  libraryId: string
}

export interface AuthorQuickMatchPayload {
  asin?: string
  q?: string
  region: AudibleRegion
}

export interface AuthorImagePayload {
  url: string
}

export interface UpdateAuthorPayload {
  name?: string
  description?: string
  asin?: string
}

export interface OpenMediaItemSharePayload {
  slug: string
  mediaItemType: 'book' | 'podcastEpisode'
  mediaItemId: string
  /** 0 for no expiration */
  expiresAt: number
  isDownloadable?: boolean
}

export interface CreateApiKeyPayload {
  name: string
  expiresIn?: number
  isActive: boolean
  userId: string
}

export interface CreateCustomMetadataProviderPayload {
  name: string
  url: string
  mediaType: 'book' | 'podcast'
  authHeaderValue?: string
}

export interface UpdateLibraryItemMediaPayload {
  metadata?: {
    title?: string
    subtitle?: string
    authors?: Author[]
    narrators?: string[]
    series?: Series[]
    genres?: string[]
    tags?: string[]
    publisher?: string
    publishedYear?: string
    publishedDate?: string
    description?: string
    language?: string
    explicit?: boolean
    abridged?: boolean
    isbn?: string
    asin?: string
    // Podcast-specific fields
    feedUrl?: string
    itunesPageUrl?: string
    itunesId?: string | number
    releaseDate?: string
    [key: string]: unknown
  }
  tags?: string[]
  url?: string
  cover?: string
}

export interface TrackStartedPayload {
  libraryItemId: string
  ino: string
}

export interface TrackFinishedPayload {
  libraryItemId: string
  ino: string
}

export interface TrackProgressPayload {
  libraryItemId: string
  ino: string
  progress: number
}

export interface TaskProgressPayload {
  libraryItemId: string
  progress: number
}

export interface LibraryTaskPayload {
  libraryId: string
}

export interface StartSessionPayload {
  deviceInfo: StartSessionDeviceInfo
  supportedMimeTypes: string[]
  mediaPlayer: 'html5' | 'chromecast'
  forceTranscode: boolean
  forceDirectPlay: boolean
}

export interface OpenRssFeedPayload {
  serverAddress: string
  slug: string
  metadataDetails: {
    preventIndexing: boolean
    ownerName: string
    ownerEmail: string
  }
}

/** Request body entry for playlist create and batch add/remove */
export type PlaylistItemPayload = {
  libraryItemId: string
  episodeId?: string | null
}
