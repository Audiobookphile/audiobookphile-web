'use server'

import {
  getCurrentUser,
  getLibraries,
  getLibraryCollections,
  getLibraryPlaylists,
  searchLibrary,
} from '@/shared/lib/api'

/**
 * Server Action: Search a library
 */
export async function searchLibraryAction(libraryId: string, query: string, limit?: number) {
  return searchLibrary(libraryId, query, limit)
}

/**
 * Server Action: Get current user
 */
export async function getCurrentUserAction() {
  return getCurrentUser()
}

/**
 * Server Action: Get libraries
 */
export async function getLibrariesAction() {
  return getLibraries()
}

/**
 * Server Action: Get collections for a library
 */
export async function getCollectionsAction(libraryId: string) {
  return getLibraryCollections(libraryId)
}

/**
 * Server Action: Get playlists for a library
 */
export async function getPlaylistsAction(libraryId: string) {
  return getLibraryPlaylists(libraryId)
}
