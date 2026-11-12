'use server'

import { uploadCover } from '@/shared/lib/api'
import { fetchBookCover } from '@/shared/lib/coverFetch'

/**
 * Automatically fetch a cover image from metadata providers and save it
 * to Supabase Storage for the given library item.
 *
 * Called after upload and after metadata matching.
 * Silently succeeds/fails — cover art is non-critical.
 *
 * @returns The storage path if a cover was saved, null otherwise.
 */
export async function autoFetchCoverAction(
  libraryItemId: string,
  title: string,
  author?: string
): Promise<string | null> {
  try {
    const fetched = await fetchBookCover(title, author)
    if (!fetched) return null

    const file = new File([fetched.buffer], `cover.${fetched.extension}`, { type: fetched.contentType })
    await uploadCover(libraryItemId, file)
    return `${libraryItemId}/cover.${fetched.extension}`
  } catch (err) {
    console.error('[autoFetchCover] Failed for', libraryItemId, err)
    return null
  }
}
