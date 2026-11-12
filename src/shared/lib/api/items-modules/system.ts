import { cache } from 'react'
import {
  CreateCustomMetadataProviderPayload,
  CreateCustomMetadataProviderResponse,
  FetchPodcastFeedResponse,
  GetBackupsResponse,
  GetCustomMetadataProvidersResponse,
  GetListeningSessionsResponse,
  GetLoggerDataResponse,
  GetOpenListeningSessionsResponse,
  GetRssFeedsResponse,
  MediaItemShare,
  MetadataProvidersResponse,
  MutateBackupsResponse,
  OpenMediaItemSharePayload,
  OpenRssFeedPayload,
  OpenRssFeedResponse,
  RssPodcastEpisode,
  TasksResponse,
} from '@/types/api'
import { apiRequest } from '../client'

/**
 * Open RSS feed for an entity (series, collection, etc.)
 */
export async function openEntityRssFeed(
  entityType: 'series' | 'collection',
  entityId: string,
  payload: OpenRssFeedPayload
): Promise<OpenRssFeedResponse> {
  return apiRequest<OpenRssFeedResponse>(`/api/${entityType}/${entityId}/open-rss-feed`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Open a media item share link
 */
export async function openMediaItemShare(payload: OpenMediaItemSharePayload): Promise<MediaItemShare> {
  return apiRequest<MediaItemShare>('/api/share', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Close a media item share link
 */
export async function closeMediaItemShare(shareId: string): Promise<void> {
  return apiRequest<void>(`/api/share/${shareId}`, {
    method: 'DELETE',
  })
}

/**
 * Create a new backup
 */
export async function createBackup(): Promise<MutateBackupsResponse> {
  return apiRequest<MutateBackupsResponse>('/api/backups', {
    method: 'POST',
  })
}

/**
 * Delete a backup
 */
export async function deleteBackup(backupId: string): Promise<MutateBackupsResponse> {
  return apiRequest<MutateBackupsResponse>(`/api/backups/${backupId}`, {
    method: 'DELETE',
  })
}

/**
 * Apply a backup
 */
export async function applyBackup(backupId: string): Promise<void> {
  return apiRequest<void>(`/api/backups/${backupId}/apply`, {
    method: 'POST',
  })
}

/**
 * Delete a listening session
 */
export async function deleteListeningSession(sessionId: string): Promise<void> {
  return apiRequest<void>(`/api/sessions/${sessionId}`, {
    method: 'DELETE',
  })
}

/**
 * Close a listening session
 */
export async function closeListeningSession(sessionId: string): Promise<void> {
  return apiRequest<void>(`/api/sessions/${sessionId}/close`, {
    method: 'POST',
  })
}

/**
 * Batch delete listening sessions
 */
export async function batchDeleteListeningSessions(sessionIds: string[]): Promise<void> {
  return apiRequest<void>('/api/sessions/batch/delete', {
    method: 'POST',
    body: JSON.stringify({ sessionIds }),
  })
}

/**
 * Fetch a podcast feed from external URL
 */
export async function fetchPodcastFeed(rssFeed: string): Promise<FetchPodcastFeedResponse> {
  const queryParams = new URLSearchParams({
    rssFeed,
  })
  return apiRequest<FetchPodcastFeedResponse>(`/api/podcasts/feed?${queryParams.toString()}`, {})
}

/**
 * Download podcast episodes
 */
export async function downloadPodcastEpisodes(libraryItemId: string, episodes: RssPodcastEpisode[]): Promise<void> {
  return apiRequest<void>(`/api/items/${libraryItemId}/download-episodes`, {
    method: 'POST',
    body: JSON.stringify({ episodes }),
  })
}

/**
 * Clear podcast download queue
 */
export async function clearPodcastDownloadQueue(libraryItemId: string): Promise<void> {
  return apiRequest<void>(`/api/items/${libraryItemId}/clear-download-queue`, {
    method: 'POST',
  })
}

/**
 * Get background tasks
 */
export async function getTasks(): Promise<TasksResponse> {
  return apiRequest<TasksResponse>('/api/tasks', {})
}

/**
 * Match all items in a library with metadata
 */
export async function matchAll(libraryId: string): Promise<void> {
  return apiRequest<void>(`/api/libraries/${libraryId}/match-all`, {
    method: 'POST',
  })
}

/**
 * Create custom metadata provider
 */
export async function createCustomMetadataProvider(
  payload: CreateCustomMetadataProviderPayload
): Promise<CreateCustomMetadataProviderResponse> {
  return apiRequest<CreateCustomMetadataProviderResponse>('/api/custom-metadata-providers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export const getMetadataProviders = cache(async (): Promise<MetadataProvidersResponse> => {
  return apiRequest<MetadataProvidersResponse>('/api/search/providers', {})
})

export const getTags = cache(async () => {
  return apiRequest<{ tags: string[] }>('/api/tags', {})
})

export const getGenres = cache(async () => {
  return apiRequest<{ genres: string[] }>('/api/genres', {})
})

export const getRssFeeds = cache(async (): Promise<GetRssFeedsResponse> => {
  return apiRequest<GetRssFeedsResponse>('/api/feeds', {})
})

export const getCustomMetadataProviders = cache(async (): Promise<GetCustomMetadataProvidersResponse> => {
  return apiRequest<GetCustomMetadataProvidersResponse>('/api/custom-metadata-providers', {})
})

export async function deleteCustomMetadataProvider(providerId: string): Promise<void> {
  return apiRequest<void>(`/api/custom-metadata-providers/${providerId}`, {
    method: 'DELETE',
  })
}

export async function closeRssFeed(feedId: string): Promise<void> {
  return apiRequest<void>(`/api/feeds/${feedId}/close`, {
    method: 'POST',
  })
}

export const getBackups = cache(async (): Promise<GetBackupsResponse> => {
  return apiRequest<GetBackupsResponse>('/api/backups', {})
})

export const getListeningSessions = cache(async (queryParams?: string): Promise<GetListeningSessionsResponse> => {
  return apiRequest<GetListeningSessionsResponse>(`/api/sessions${queryParams ? `?${queryParams}` : ''}`, {})
})

export const getOpenListeningSessions = cache(async (): Promise<GetOpenListeningSessionsResponse> => {
  return apiRequest<GetOpenListeningSessionsResponse>('/api/sessions/open', {})
})

export const getLoggerData = cache(async (): Promise<GetLoggerDataResponse> => {
  return apiRequest<GetLoggerDataResponse>('/api/logger-data', {})
})
