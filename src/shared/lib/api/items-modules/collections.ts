import { cache } from 'react'
import { Collection, Playlist, PlaylistItemPayload, Series } from '@/types/api'
import { apiRequest } from '../client'

/**
 * Create a new collection
 */
export async function createCollection(payload: {
  libraryId: string
  name: string
  description?: string | null
  books?: string[]
}): Promise<Collection> {
  return apiRequest<Collection>('/api/collections', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Add a book to an existing collection
 */
export async function addBookToCollection(collectionId: string, libraryItemId: string): Promise<Collection> {
  return apiRequest<Collection>(`/api/collections/${collectionId}/book`, {
    method: 'POST',
    body: JSON.stringify({ id: libraryItemId }),
  })
}

/**
 * Remove a book from a collection
 */
export async function removeBookFromCollection(collectionId: string, libraryItemId: string): Promise<Collection> {
  return apiRequest<Collection>(`/api/collections/${collectionId}/book/${libraryItemId}`, {
    method: 'DELETE',
  })
}

/**
 * Update collection details
 */
export async function updateCollection(
  collectionId: string,
  payload: { name?: string; description?: string }
): Promise<Collection> {
  return apiRequest<Collection>(`/api/collections/${collectionId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

/**
 * Delete a collection
 */
export async function deleteCollection(collectionId: string): Promise<void> {
  return apiRequest<void>(`/api/collections/${collectionId}`, {
    method: 'DELETE',
  })
}

/**
 * Create a playlist from a collection
 */
export async function createPlaylistFromCollection(collectionId: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/api/collections/${collectionId}/create-playlist`, {
    method: 'POST',
  })
}

/**
 * Delete a playlist
 */
export async function deletePlaylist(playlistId: string): Promise<void> {
  return apiRequest<void>(`/api/playlists/${playlistId}`, {
    method: 'DELETE',
  })
}

/**
 * Create a new playlist
 */
export async function createPlaylist(payload: {
  libraryId: string
  name: string
  description?: string
  items?: PlaylistItemPayload[]
}): Promise<Playlist> {
  return apiRequest<Playlist>('/api/playlists', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Batch add items to a playlist
 */
export async function batchAddToPlaylist(playlistId: string, items: PlaylistItemPayload[]): Promise<Playlist> {
  return apiRequest<Playlist>(`/api/playlists/${playlistId}/batch/add`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  })
}

/**
 * Batch remove items from a playlist
 */
export async function batchRemoveFromPlaylist(playlistId: string, items: PlaylistItemPayload[]): Promise<Playlist> {
  return apiRequest<Playlist>(`/api/playlists/${playlistId}/batch/remove`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  })
}

export const getPlaylist = cache(async (playlistId: string): Promise<Playlist> => {
  return apiRequest<Playlist>(`/api/playlists/${playlistId}`, {})
})

export const getCollection = cache(async (collectionId: string): Promise<Collection> => {
  return apiRequest<Collection>(`/api/collections/${collectionId}?include=rssfeed`, {})
})

export const getSeries = cache(async (libraryId: string, seriesId: string): Promise<Series> => {
  return apiRequest<Series>(`/api/libraries/${libraryId}/series/${seriesId}?include=rssfeed`, {})
})
