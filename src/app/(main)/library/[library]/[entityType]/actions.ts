'use server'

import {
  deleteAuthor as apiDeleteAuthor,
  quickMatchAuthor as apiQuickMatchAuthor,
  removeAuthorImage as apiRemoveAuthorImage,
  submitAuthorImage as apiSubmitAuthorImage,
  updateAuthor as apiUpdateAuthor,
} from '@/shared/lib/api'
import type { Author, AuthorQuickMatchPayload } from '@/types/api'

/**
 * Quick-match an author against Open Library / Google Books to fill in
 * description and fetch an author image.
 */
export async function quickMatchAuthorAction(
  authorId: string,
  payload: AuthorQuickMatchPayload
): Promise<{ updated: boolean; author: Author } | null> {
  try {
    return await apiQuickMatchAuthor(authorId, payload)
  } catch (err) {
    console.error('[quickMatchAuthor] failed:', err)
    return null
  }
}

export async function updateAuthorAction(
  authorId: string,
  editedAuthor: Partial<Author>
): Promise<{ updated: boolean; merged?: boolean; author: Author } | null> {
  try {
    return await apiUpdateAuthor(authorId, editedAuthor)
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error), { cause: error })
  }
}

export async function deleteAuthorAction(authorId: string) {
  try {
    await apiDeleteAuthor(authorId)
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error), { cause: error })
  }
}

/**
 * Fetch and save an author image from a URL.
 */
export async function submitAuthorImageAction(authorId: string, url: string) {
  try {
    return await apiSubmitAuthorImage(authorId, { url })
  } catch (err) {
    console.error('[submitAuthorImage] failed:', err)
    return null
  }
}

export async function removeAuthorImageAction(authorId: string) {
  try {
    await apiRemoveAuthorImage(authorId)
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error), { cause: error })
  }
}
