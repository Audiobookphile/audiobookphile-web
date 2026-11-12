import { apiRequest } from './client'

export async function removeGenre(genre: string): Promise<{ numItemsUpdated: number }> {
  return apiRequest<{ numItemsUpdated: number }>(`/api/genres/${encodeURIComponent(genre)}`, {
    method: 'DELETE',
  })
}

export async function renameGenre(
  genre: string,
  newGenreName: string
): Promise<{ genreMerged: boolean; numItemsUpdated: number }> {
  return apiRequest<{ genreMerged: boolean; numItemsUpdated: number }>(`/api/genres/${encodeURIComponent(genre)}`, {
    method: 'PUT',
    body: JSON.stringify({ newGenreName }),
  })
}

export async function removeTag(tag: string): Promise<{ numItemsUpdated: number }> {
  return apiRequest<{ numItemsUpdated: number }>(`/api/tags/${encodeURIComponent(tag)}`, {
    method: 'DELETE',
  })
}

export async function renameTag(
  tag: string,
  newTagName: string
): Promise<{ tagMerged: boolean; numItemsUpdated: number }> {
  return apiRequest<{ tagMerged: boolean; numItemsUpdated: number }>(`/api/tags/${encodeURIComponent(tag)}`, {
    method: 'PUT',
    body: JSON.stringify({ newTagName }),
  })
}
