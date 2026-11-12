import { ServerSettings } from '@/types/api'

export type UpdateServerSettingsApiResponse = {
  serverSettings: ServerSettings
}

export type UpdateSortingPrefixesApiResponse = {
  rowsUpdated: number
  serverSettings: ServerSettings
}

// Server Action — ABS-specific, not available in Supabase-backed version
export async function updateServerSettings(
  _settingsUpdatePayload: Partial<ServerSettings>
): Promise<UpdateServerSettingsApiResponse> {
  'use server'
  console.warn('[settings/actions] updateServerSettings is not available in the Supabase-backed version')
  return { serverSettings: {} as ServerSettings }
}

// Server Action — ABS-specific, not available in Supabase-backed version
export async function updateSortingPrefixes(_sortingPrefixes: string[]): Promise<UpdateSortingPrefixesApiResponse> {
  'use server'
  console.warn('[settings/actions] updateSortingPrefixes is not available in the Supabase-backed version')
  return { rowsUpdated: 0, serverSettings: {} as ServerSettings }
}
