'use server'

/**
 * ABS-specific — not available in the Supabase-backed version.
 */
export async function openMediaItemShareAction(_payload: unknown) {
  console.warn('[shareActions] openMediaItemShare is not available in the Supabase-backed version')
  return null
}

/**
 * ABS-specific — not available in the Supabase-backed version.
 */
export async function closeMediaItemShareAction(_shareId: string) {
  console.warn('[shareActions] closeMediaItemShare is not available in the Supabase-backed version')
  return null
}
