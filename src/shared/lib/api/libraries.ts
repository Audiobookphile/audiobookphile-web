import { cache } from 'react'
import {
  GetAuthorsResponse,
  GetCollectionsResponse,
  GetLibrariesResponse,
  GetLibraryItemsResponse,
  GetPlaylistsResponse,
  GetSeriesResponse,
  Library,
  LibraryFilterData,
  LibraryItem,
  LibraryStats,
  PersonalizedShelf,
  SaveLibraryOrderApiResponse,
} from '@/types/api'
import { apiRequest } from './client'

/**
 * Get filter data for a library (genres, tags, authors, series, etc.)
 * Used for populating filter dropdown menus
 */
export async function getLibraryFilterData(libraryId: string): Promise<LibraryFilterData> {
  return await apiRequest<LibraryFilterData>(`/api/libraries/${libraryId}/filterdata`, {})
}

/**
 * Create a library
 * @param newLibrary - New library object
 * Returns: Library object
 */
export async function createLibrary(newLibrary: Library): Promise<Library> {
  return apiRequest<Library>(`/api/libraries/`, {
    method: 'POST',
    body: JSON.stringify(newLibrary),
  })
}

/**
 * Update a library
 * @param libraryId - Library ID
 * @param newLibrary - New library object
 * Returns: Library object
 */
export async function updateLibrary(libraryId: string, updatedLibrary: Library): Promise<Library> {
  return apiRequest<Library>(`/api/libraries/${libraryId}`, {
    method: 'PATCH',
    body: JSON.stringify(updatedLibrary),
  })
}

/**
 * Delete a library
 * @param libraryId - Library ID
 * Returns: Library object
 */
export async function deleteLibrary(libraryId: string): Promise<Library> {
  return apiRequest<Library>(`/api/libraries/${libraryId}`, {
    method: 'DELETE',
  })
}

/**
 * Scan a library
 * @param libraryId - Library ID
 * @param force - Force a full rescan even if nothing changed
 * Returns: void (success) or throws error
 */
export async function scanLibrary(libraryId: string, force: boolean = false): Promise<void> {
  return apiRequest<void>(`/api/libraries/${libraryId}/scan?force=${force ? 1 : 0}`, {
    method: 'POST',
  })
}

/**
 * Save the order of libraries
 * @param reorderObjects - Array of `{ id, newOrder }` pairs
 * Returns: Updated libraries list
 */
export async function saveLibraryOrder(
  reorderObjects: { id: string; newOrder: number }[]
): Promise<SaveLibraryOrderApiResponse> {
  return apiRequest<SaveLibraryOrderApiResponse>('/api/libraries/order', {
    method: 'POST',
    body: JSON.stringify(reorderObjects),
  })
}

export const getLibraries = cache(async (): Promise<GetLibrariesResponse> => {
  return await apiRequest<GetLibrariesResponse>('/api/libraries', {})
})

export const getLibrary = cache(async (libraryId: string): Promise<Library> => {
  return await apiRequest<Library>(`/api/libraries/${libraryId}`, {})
})

export const getLibraryPersonalized = cache(async (libraryId: string): Promise<PersonalizedShelf[]> => {
  return await apiRequest<PersonalizedShelf[]>(`/api/libraries/${libraryId}/personalized?include=rssfeed,share`, {
    cache: 'no-store',
  })
})

export const getLibraryItems = cache(
  async (libraryId: string, queryParams?: string): Promise<GetLibraryItemsResponse> => {
    return await apiRequest<GetLibraryItemsResponse>(
      `/api/libraries/${libraryId}/items${queryParams ? `?${queryParams}` : ''}`,
      {}
    )
  }
)

/**
 * Get a single library item by ID.
 * @param itemId - Library item ID
 * @param expanded - If true, returns expanded item with full media/chapters etc.
 * @param include - Optional comma-separated includes: rssfeed, share, downloads
 */
export const getLibraryItem = cache(
  async (itemId: string, expanded?: boolean, include?: string): Promise<LibraryItem> => {
    const params = new URLSearchParams()
    params.set('expanded', expanded ? '1' : '0')
    if (include) params.set('include', include)
    return await apiRequest<LibraryItem>(`/api/items/${itemId}?${params.toString()}`, {})
  }
)

export async function getLibraryStats(libraryId: string): Promise<LibraryStats> {
  return apiRequest(`/api/libraries/${libraryId}/stats`, {})
}

export const getLibrarySeries = cache(async (libraryId: string, queryParams?: string): Promise<GetSeriesResponse> => {
  return await apiRequest<GetSeriesResponse>(
    `/api/libraries/${libraryId}/series${queryParams ? `?${queryParams}` : ''}`,
    {}
  )
})

export const getLibraryAuthors = cache(async (libraryId: string, queryParams?: string): Promise<GetAuthorsResponse> => {
  return await apiRequest<GetAuthorsResponse>(
    `/api/libraries/${libraryId}/authors${queryParams ? `?${queryParams}` : ''}`,
    {}
  )
})

export const getLibraryCollections = cache(
  async (libraryId: string, queryParams?: string): Promise<GetCollectionsResponse> => {
    return await apiRequest<GetCollectionsResponse>(
      `/api/libraries/${libraryId}/collections${queryParams ? `?${queryParams}` : ''}`,
      {}
    )
  }
)

export const getLibraryPlaylists = cache(
  async (libraryId: string, queryParams?: string): Promise<GetPlaylistsResponse> => {
    return await apiRequest<GetPlaylistsResponse>(
      `/api/libraries/${libraryId}/playlists${queryParams ? `?${queryParams}` : ''}`,
      {}
    )
  }
)

export async function deduplicateLibrary(libraryId: string): Promise<{ success: boolean; removedCount: number }> {
  return apiRequest<{ success: boolean; removedCount: number }>(`/api/libraries/${libraryId}/deduplicate`, {
    method: 'POST',
  })
}

export async function smartSortLibrary(
  libraryId: string,
  criteria: string = 'chronological reading order'
): Promise<string[]> {
  return apiRequest<string[]>(`/api/libraries/${libraryId}/smart-sort`, {
    method: 'POST',
    body: JSON.stringify({ criteria }),
  })
}

export async function getBatchLibraryItems(itemIds: string[]): Promise<LibraryItem[]> {
  const res = await apiRequest<{ items: LibraryItem[] }>('/api/items/batch', {
    method: 'POST',
    body: JSON.stringify({ itemIds }),
  })
  return res.items || []
}
