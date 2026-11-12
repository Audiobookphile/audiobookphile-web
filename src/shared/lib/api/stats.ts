import 'server-only'

import { apiRequest } from '@/shared/lib/api/client'

export interface MediaProgressRow {
  id: string
  library_item_id: string
  duration: number | null
  progress: number | null
  is_finished: boolean | null
  finished_at: string | null
  last_update: string | null
  started_at: string | null
  title: string | null
}

export interface PlaybackSessionRow {
  id: string
  display_title: string | null
  display_author: string | null
  time_listening: number | null
  session_date: string | null
  updated_at: string
}

export interface UserStatsData {
  mediaProgress: MediaProgressRow[]
  recentSessions: PlaybackSessionRow[]
}

/**
 * Fetch all data needed for the user stats page server-side.
 *
 * Throws on network/API failure rather than swallowing errors silently —
 * callers (Server Components) should handle the error boundary themselves.
 */
export async function getUserStatsData(): Promise<UserStatsData> {
  const data = await apiRequest<UserStatsData>('/api/me/stats', {
    method: 'GET',
  })
  return data ?? { mediaProgress: [], recentSessions: [] }
}
