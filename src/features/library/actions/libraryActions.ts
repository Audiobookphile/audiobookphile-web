'use server'

import {
  getLibraryAuthors,
  getLibraryCollections,
  getLibraryFilterData,
  getLibraryItems,
  getLibraryPlaylists,
  getLibrarySeries,
} from '@/shared/lib/api'
import { apiRequest } from '@/shared/lib/api/client'
import { getLibraryStats } from '@/shared/lib/api/libraries'

export async function fetchLibraryItemsAction(libraryId: string, query?: string) {
  return getLibraryItems(libraryId, query)
}

/**
 * Similar items for an item, ranked by embedding similarity.
 *
 * Exposed as a server action because the widget that consumes it is a Client
 * Component, and the `@/shared/lib/api` barrel transitively imports
 * `server-only` / `next/headers`, which fails the build outright with
 * "'server-only' cannot be imported from a Client Component module".
 *
 * It is a server action rather than a bare `fetch` for the opposite reason the
 * original was wrong: bare `fetch` skips the API layer entirely, so no session
 * token was attached and every item page 401'd on this call and logged an
 * unhandled error while the "similar books" shelf silently rendered nothing.
 */
export async function fetchSimilarItemsAction<T>(itemId: string): Promise<{ similarItems: T[] }> {
  return apiRequest<{ similarItems: T[] }>(`/api/items/${itemId}/similar`, {})
}

export async function fetchLibraryFilterDataAction(libraryId: string) {
  return getLibraryFilterData(libraryId)
}

export async function fetchSeriesAction(libraryId: string, query?: string) {
  return getLibrarySeries(libraryId, query)
}

export async function fetchAuthorsAction(libraryId: string, query?: string) {
  return getLibraryAuthors(libraryId, query)
}

export async function fetchCollectionsAction(libraryId: string, query?: string) {
  return getLibraryCollections(libraryId, query)
}

export async function fetchPlaylistsAction(libraryId: string, query?: string) {
  return getLibraryPlaylists(libraryId, query)
}

export async function fetchLibraryStatsAction(libraryId: string) {
  return getLibraryStats(libraryId)
}
