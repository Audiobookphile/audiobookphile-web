import {
  BookSearchResult,
  DeleteLibraryItemResponse,
  PodcastSearchResult,
  SearchLibraryResponse,
  UpdateLibraryItemMediaPayload,
  UpdateLibraryItemMediaResponse,
} from '@/types/api'
import { apiRequest } from '../client'

/**
 * Search the library items
 */
export async function searchLibrary(libraryId: string, query: string, limit?: number): Promise<SearchLibraryResponse> {
  const queryParams = new URLSearchParams({
    q: query,
  })
  if (limit) {
    queryParams.append('limit', limit.toString())
  }
  return apiRequest<SearchLibraryResponse>(`/api/libraries/${libraryId}/search?${queryParams.toString()}`, {})
}

/**
 * Search for book metadata from external providers
 */
export async function searchBooks(
  provider: string,
  title: string,
  author?: string,
  libraryItemId?: string
): Promise<BookSearchResult[]> {
  const params = new URLSearchParams({
    provider,
    title,
  })
  if (author) {
    params.append('author', author)
  }
  if (libraryItemId) {
    params.append('libraryItemId', libraryItemId)
  }

  const res = await apiRequest<{ results: BookSearchResult[] } | BookSearchResult[]>(
    `/api/search/books?${params.toString()}`,
    {}
  )
  return Array.isArray(res) ? res : res.results || []
}

/**
 * Search for podcasts
 */
export async function searchPodcasts(term: string): Promise<PodcastSearchResult[]> {
  const params = new URLSearchParams({
    term,
  })
  const res = await apiRequest<{ results: PodcastSearchResult[] } | PodcastSearchResult[]>(
    `/api/search/podcasts?${params.toString()}`,
    {}
  )
  return Array.isArray(res) ? res : res.results || []
}

/**
 * Update metadata for a library item
 */
export async function updateLibraryItemMedia(
  libraryItemId: string,
  updatePayload: UpdateLibraryItemMediaPayload
): Promise<UpdateLibraryItemMediaResponse> {
  return apiRequest<UpdateLibraryItemMediaResponse>(`/api/items/${libraryItemId}/media`, {
    method: 'PATCH',
    body: JSON.stringify(updatePayload),
  })
}

/**
 * Update media finished status for progress
 */
export async function updateMediaFinished(
  libraryItemId: string,
  payload: { isFinished: boolean; episodeId?: string }
): Promise<void> {
  return apiRequest<void>(`/api/me/progress/${libraryItemId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      isFinished: payload.isFinished,
      episodeId: payload.episodeId,
    }),
  })
}

/**
 * Batch update media finished status
 */
export async function batchUpdateMediaFinished(
  payload: { libraryItemId: string; episodeId?: string; isFinished: boolean }[]
): Promise<void> {
  return apiRequest<void>(`/api/me/progress/batch/update`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

/**
 * Rescan a library item
 */
export async function rescanLibraryItem(
  libraryItemId: string
): Promise<{ result: 'UPDATED' | 'UPTODATE' | 'REMOVED' | null }> {
  return apiRequest<{ result: 'UPDATED' | 'UPTODATE' | 'REMOVED' | null }>(`/api/items/${libraryItemId}/scan`, {
    method: 'POST',
  })
}

/**
 * Send ebook to an ereader device
 */
export async function sendEbookToDevice(payload: { libraryItemId: string; deviceName: string }): Promise<void> {
  return apiRequest<void>(`/api/emails/send-ebook`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Remove a series from continue listening
 */
export async function removeSeriesFromContinueListening(seriesId: string): Promise<void> {
  return apiRequest<void>(`/api/me/series-progress/${seriesId}`, {
    method: 'DELETE',
  })
}

/**
 * Remove an item from continue listening
 */
export async function removeFromContinueListening(progressId: string): Promise<void> {
  return apiRequest<void>(`/api/me/progress/${progressId}`, {
    method: 'DELETE',
  })
}

/**
 * Delete a library item.
 * Backend reads `hardDelete=1` (not `hard`) — keep in sync with deleteLibraryItemAction.
 */
export async function deleteLibraryItem(
  libraryItemId: string,
  hardDelete: boolean
): Promise<DeleteLibraryItemResponse> {
  return apiRequest<DeleteLibraryItemResponse>(`/api/items/${libraryItemId}${hardDelete ? '?hardDelete=1' : ''}`, {
    method: 'DELETE',
  })
}

/**
 * Delete a single media episode from a library item
 */
export async function deleteLibraryItemMediaEpisode(
  libraryItemId: string,
  episodeId: string,
  hardDelete = false
): Promise<void> {
  const hard = hardDelete ? '1' : '0'
  return apiRequest<void>(`/api/items/${libraryItemId}/episode/${episodeId}?hard=${hard}`, {
    method: 'DELETE',
  })
}

/**
 * Check if a book already exists before uploading
 */
export async function checkExistingBook(
  title: string,
  author: string,
  libraryId: string,
  mediaType: string
): Promise<{ mediaId: string | null }> {
  const queryParams = new URLSearchParams()
  if (title) queryParams.append('title', title)
  if (author) queryParams.append('author', author)
  if (libraryId) queryParams.append('libraryId', libraryId)
  if (mediaType) queryParams.append('mediaType', mediaType)

  return apiRequest<{ mediaId: string | null }>(`/api/items/check-existing?${queryParams.toString()}`)
}
