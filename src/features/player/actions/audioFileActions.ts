'use server'

import { apiRequest } from '@/shared/lib/api/client'
import type { FFProbeData } from '@/types/api'

/**
 * FFProbe data is not available — audio metadata isn't extracted during upload.
 */
export async function getAudioFileFFProbeDataAction(_itemId: string, _fileIno: string): Promise<FFProbeData> {
  return {}
}

/**
 * Delete an audio file from Supabase Storage and remove it from the book's audio_files JSONB.
 */
export async function deleteLibraryFileAction(itemId: string, fileIno: string): Promise<void> {
  await apiRequest(`/api/items/${itemId}/audio-files/${fileIno}`, {
    method: 'DELETE',
  })
}
