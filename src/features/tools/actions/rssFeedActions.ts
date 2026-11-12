'use server'

/**
 * ABS-specific — not available in the Supabase-backed version.
 */
export async function closeRssFeed(_feedId: string): Promise<void> {
  console.warn('[rssFeedActions] closeRssFeed is not available in the Supabase-backed version')
}

/**
 * ABS-specific — not available in the Supabase-backed version.
 */
export async function openEntityRssFeed(
  _entityType: 'item' | 'collection' | 'series',
  _entityId: string,
  _payload: unknown
) {
  console.warn('[rssFeedActions] openEntityRssFeed is not available in the Supabase-backed version')
  return null
}
