'use server'

import { apiRequest } from '@/shared/lib/api'
import type { PlaybackSession, StartSessionPayload } from '@/types/api'

interface SessionSyncData {
  currentTime: number
  duration?: number
  timeListened: number
  libraryItemId?: string
  episodeId?: string | null
  seekEpoch?: number
}

/**
 * Start a playback session — queries the Supabase Edge Function directly
 * and returns signed audio URLs for the requested library item.
 */
export async function startPlaybackSession(libraryItemId: string, _payload: StartSessionPayload, episodeId?: string) {
  let url = `/api/items/${libraryItemId}/play`
  if (episodeId) {
    url = `/api/items/${libraryItemId}/play/${episodeId}`
  }
  return await apiRequest<PlaybackSession>(url, {
    method: 'POST',
    body: JSON.stringify({
      deviceInfo: { clientName: 'Audiobookphile Web' },
      mediaPlayer: 'web',
      forceDirectPlay: true,
    }),
  })
}

/**
 * Sync playback progress to Supabase via Edge Function.
 */
export async function syncPlaybackSession(sessionId: string, syncData: SessionSyncData): Promise<void> {
  try {
    await apiRequest(`/api/session/${sessionId}/sync`, {
      method: 'POST',
      body: JSON.stringify({
        currentTime: syncData.currentTime,
        duration: syncData.duration,
        progress: syncData.duration && syncData.duration > 0 ? syncData.currentTime / syncData.duration : 0,
        timeListened: syncData.timeListened,
        episodeId: syncData.episodeId || undefined,
        seekEpoch: syncData.seekEpoch,
      }),
    })
  } catch (err) {
    // Rethrow deliberately. This used to swallow the failure into a
    // console.error, which made the catch block in usePlaybackSession.syncProgress
    // unreachable: `failedSyncsRef` stayed at 0, so the "progress is not being
    // synced" toast could never fire, and progress was silently lost exactly when
    // the edge function started rejecting every sync -- which is the one
    // situation the toast exists to report. The consumer already counts failures
    // and surfaces the warning, and logs the error itself, so re-throwing is
    // enough; logging here too would just double the noise.
    throw err
  }
}

/**
 * Close a playback session — persists final progress to Supabase via Edge Function.
 */
export async function closePlaybackSession(sessionId: string, syncData: SessionSyncData | null): Promise<void> {
  if (!syncData) return
  try {
    await apiRequest(`/api/session/${sessionId}/close`, {
      method: 'POST',
      body: JSON.stringify({
        currentTime: syncData.currentTime,
        duration: syncData.duration,
        timeListened: syncData.timeListened,
        episodeId: syncData.episodeId || undefined,
      }),
    })
  } catch (err) {
    // Same reasoning as syncPlaybackSession: swallowing here made the caller's
    // catch (and its "Failed to close session" log) unreachable. Note the
    // caller's `finally` still resets the session refs either way, so a failed
    // close cannot wedge the player — it only means final progress was not
    // persisted, which is worth surfacing rather than hiding.
    throw err
  }
}
