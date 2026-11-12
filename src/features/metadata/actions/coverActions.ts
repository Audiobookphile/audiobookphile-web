'use server'

import { removeCover, setCoverFromLocalFile, updateCoverFromUrl, uploadCover } from '@/shared/lib/api'
import { fetchBookCover } from '@/shared/lib/coverFetch'

/**
 * Server Action: Upload a cover image file for a library item
 */
export async function uploadCoverAction(libraryItemId: string, base64Data: string, fileName: string) {
  // atob + Uint8Array instead of Buffer: the base64 payload arrives as a raw
  // string (btoa on the client) and decoding it this way works on every
  // runtime this action can land on — Bun, the edge runtime, or a browser.
  const bytes = Uint8Array.from(atob(base64Data), (char) => char.charCodeAt(0))
  const extension = fileName.split('.').pop() || 'jpg'
  const contentType = `image/${extension === 'jpg' ? 'jpeg' : extension}`
  const file = new File([bytes], fileName, { type: contentType })
  return uploadCover(libraryItemId, file)
}

/**
 * Server Action: Remove the current cover from a library item
 */
export async function removeCoverAction(libraryItemId: string) {
  return removeCover(libraryItemId)
}

/**
 * Server Action: Update cover from a URL — fetches the image and stores it in Supabase Storage
 */
export async function updateCoverFromUrlAction(libraryItemId: string, coverUrl: string) {
  return updateCoverFromUrl(libraryItemId, coverUrl)
}

/**
 * Server Action: Auto-fetch cover from metadata providers (Open Library, Google Books)
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
    console.error('[coverActions] autoFetchCover failed:', err)
    return null
  }
}

/**
 * Server Action: Set cover from a local file — not available in Supabase-backed version
 */
export async function setCoverFromLocalFileAction(libraryItemId: string, filePath: string) {
  return setCoverFromLocalFile(libraryItemId, filePath)
}
