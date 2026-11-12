'use server'

import { apiRequest } from '@/shared/lib/api'
import type { Playlist, PlaylistItemPayload } from '@/types/api'

/**
 * Delete a playlist.
 *
 * The route this calls was never implemented server-side, so "Delete playlist"
 * 404'd and the card showed a generic "Failed to remove" toast. It exists now,
 * scoped to the caller's own playlists.
 */
export async function deletePlaylistAction(playlistId: string): Promise<void> {
  return await apiRequest<void>(`/api/playlists/${playlistId}`, {
    method: 'DELETE',
  })
}

export async function createPlaylistAction(payload: {
  libraryId: string
  name: string
  description?: string | null
  items?: PlaylistItemPayload[]
}): Promise<Playlist> {
  return await apiRequest<Playlist>('/api/playlists', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Add items to a playlist.
 *
 * This called `POST /api/playlists/:id/batch-add`, a route that was never
 * implemented, so "Add to playlist" 404'd and the modal reported failure while
 * the item silently did not join. The server's route for this is
 * `POST /api/playlists/:id/items`, which now accepts the same `{items: [...]}`.
 */
export async function batchAddToPlaylistAction(playlistId: string, items: PlaylistItemPayload[]): Promise<Playlist> {
  return await apiRequest<Playlist>(`/api/playlists/${playlistId}/items`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  })
}

/**
 * Remove items from a playlist.
 *
 * Same story: `/batch-remove` did not exist. The server's route is
 * `DELETE /api/playlists/:id/items`, which now takes `{items: [...]}` for a batch
 * and still accepts a single `{libraryItemId}`.
 */
export async function batchRemoveFromPlaylistAction(
  playlistId: string,
  items: PlaylistItemPayload[]
): Promise<Playlist> {
  return await apiRequest<Playlist>(`/api/playlists/${playlistId}/items`, {
    method: 'DELETE',
    body: JSON.stringify({ items }),
  })
}
