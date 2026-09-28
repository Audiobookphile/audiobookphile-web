'use server'

import { apiRequest } from '@/shared/lib/api'
import type { Collection } from '@/types/api'

/**
 * Create a collection w/ initial book library item IDs
 */
export async function createCollectionAction(payload: {
  libraryId: string
  name: string
  description?: string | null
  books?: string[]
}): Promise<Collection> {
  return await apiRequest<Collection>('/api/collections', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Add a library item to a collection.
 *
 * This sent `{ libraryItemId }`, which matched neither shape the server accepted:
 * the create-collection route takes `{ items: [...] }` and the add route took a
 * bare array. Every use therefore failed with 400 "Expected array, received
 * object" and the modal showed its generic error toast. Now uses the same
 * `{ items: [...] }` envelope as the create route.
 */
export async function addBookToCollectionAction(collectionId: string, libraryItemId: string): Promise<Collection> {
  return await apiRequest<Collection>(`/api/collections/${collectionId}/items`, {
    method: 'POST',
    body: JSON.stringify({ items: [libraryItemId] }),
  })
}

/**
 * Remove a library item from a collection
 */
export async function removeBookFromCollectionAction(collectionId: string, libraryItemId: string): Promise<Collection> {
  return await apiRequest<Collection>(`/api/collections/${collectionId}/items/${libraryItemId}`, {
    method: 'DELETE',
  })
}

/**
 * Update a collection's name and/or description
 */
export async function updateCollectionAction(
  collectionId: string,
  payload: { name?: string; description?: string }
): Promise<Collection> {
  return await apiRequest<Collection>(`/api/collections/${collectionId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

/**
 * Delete a collection
 */
export async function deleteCollectionAction(collectionId: string): Promise<void> {
  return await apiRequest<void>(`/api/collections/${collectionId}`, {
    method: 'DELETE',
  })
}

/**
 * Create a playlist from a collection — not available in Supabase-backed version
 */
export async function createPlaylistFromCollectionAction(_collectionId: string): Promise<{ id: string }> {
  console.warn('[collectionActions] createPlaylistFromCollection is not available in the Supabase-backed version')
  return { id: '' }
}
