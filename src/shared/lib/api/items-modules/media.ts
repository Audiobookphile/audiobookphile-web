import { FFProbeData, UploadCoverResponse } from '@/types/api'
import { apiRequest } from '../client'

/**
 * Get FFProbe data for an audio file
 * Admin-only endpoint that returns raw ffprobe output
 * @param itemId - Library item ID
 * @param fileIno - Audio file inode
 * Returns: FFProbe data object
 */
export async function getAudioFileFFProbeData(itemId: string, fileIno: string): Promise<FFProbeData> {
  return apiRequest<FFProbeData>(`/api/items/${itemId}/ffprobe/${fileIno}`, {})
}

/**
 * Upload a cover image file for a library item
 * Returns: { success: true, cover: coverPath }
 */
export async function uploadCover(libraryItemId: string, file: File): Promise<UploadCoverResponse> {
  const formData = new FormData()
  formData.append('cover', file, file.name)

  return apiRequest<UploadCoverResponse>(`/api/items/${libraryItemId}/cover`, {
    method: 'POST',
    body: formData,
  })
}

/**
 * Remove the current cover from a library item
 * Returns: 200 status with no body
 */
export async function removeCover(libraryItemId: string): Promise<void> {
  return apiRequest<void>(`/api/items/${libraryItemId}/cover`, {
    method: 'DELETE',
  })
}

/**
 * Delete a library file from a library item
 * Returns: 200 status with no body
 */
export async function deleteLibraryFile(libraryItemId: string, fileIno: string): Promise<void> {
  return apiRequest<void>(`/api/items/${libraryItemId}/file/${fileIno}`, {
    method: 'DELETE',
  })
}

/**
 * Update cover from a URL
 * Returns: { success: true, cover: coverPath }
 */
export async function updateCoverFromUrl(libraryItemId: string, coverUrl: string): Promise<UploadCoverResponse> {
  return apiRequest<UploadCoverResponse>(`/api/items/${libraryItemId}/cover`, {
    method: 'POST',
    body: JSON.stringify({ url: coverUrl }),
  })
}

/**
 * Set cover from an existing local file on server
 * Returns: { success: true, cover: coverPath }
 */
export async function setCoverFromLocalFile(libraryItemId: string, filePath: string): Promise<UploadCoverResponse> {
  return apiRequest<UploadCoverResponse>(`/api/items/${libraryItemId}/cover`, {
    method: 'POST',
    body: JSON.stringify({ path: filePath }),
  })
}

/**
 * Quick embed metadata directly into audio files
 */
export async function embedMetadataQuick(libraryItemId: string): Promise<void> {
  return apiRequest<void>(`/api/items/${libraryItemId}/embed-metadata`, {
    method: 'POST',
  })
}
