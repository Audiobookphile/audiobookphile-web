import { apiRequest } from '@/shared/lib/api/client'

export interface SupabaseProgressPayload {
  library_item_id: string
  episode_id?: string | null
  duration?: number
  progress?: number
  current_time_pos: number
  is_finished?: boolean
}

/**
 * Syncs media progress to the Supabase database.
 * This is intended to be called from Server Actions or Route Handlers.
 */
export async function syncProgressToSupabase(payload: SupabaseProgressPayload) {
  try {
    await apiRequest('/playback-progress', {
      method: 'POST',
      body: JSON.stringify({
        itemId: payload.library_item_id,
        episodeId: payload.episode_id || null,
        currentTime: payload.current_time_pos,
        duration: payload.duration,
        isFinished: payload.is_finished,
      }),
    })
  } catch (error) {
    // Only log actual database errors, ignoring network transient issues if needed
    // or using a proper logger.
    console.error(
      `[Supabase] Progress sync failed for ${payload.library_item_id}:`,
      error instanceof Error ? error.message : String(error)
    )
  }
}
