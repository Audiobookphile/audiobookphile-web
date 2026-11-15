'use server'

import {
  closeRssFeed as apiCloseRssFeed,
  openEntityRssFeed as apiOpenEntityRssFeed,
} from '@/shared/lib/api/items-modules/system'
import type { OpenRssFeedPayload, OpenRssFeedResponse } from '@/types/api'

/**
 * Closes and deactivates an active RSS feed.
 */
export async function closeRssFeed(feedId: string): Promise<void> {
  await apiCloseRssFeed(feedId)
}

/**
 * Opens or regenerates a private RSS podcast feed for an item, series, or collection.
 */
export async function openEntityRssFeed(
  entityType: 'item' | 'collection' | 'series',
  entityId: string,
  payload: OpenRssFeedPayload
): Promise<OpenRssFeedResponse | null> {
  try {
    return await apiOpenEntityRssFeed(entityType, entityId, payload)
  } catch (error) {
    console.error('[rssFeedActions] Failed to open entity RSS feed:', error)
    throw error
  }
}
