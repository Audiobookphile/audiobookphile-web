'use server'

import { z } from 'zod'
import type { BookSearchResult, PodcastSearchResult } from '@/types/api'

const FetchBookMetadataSchema = z.object({
  title: z.string().max(256),
  author: z.string().max(300),
  provider: z.string().max(50),
})

/**
 * Fetch book metadata from Open Library and Google Books.
 */
export async function fetchBookMetadata(title: string, author: string, _provider: string): Promise<BookSearchResult[]> {
  try {
    const validated = FetchBookMetadataSchema.parse({ title, author, provider: _provider })
    const { apiRequest } = await import('@/shared/lib/api/client')
    const data = await apiRequest<{ results: BookSearchResult[] }>('/api/metadata/match-book', {
      method: 'POST',
      body: JSON.stringify({ title: validated.title, author: validated.author }),
    })
    return data?.results || []
  } catch (err) {
    console.error('[upload/actions] fetchBookMetadata failed:', err)
    return []
  }
}

export async function fetchPodcastMetadata(_title: string): Promise<PodcastSearchResult[]> {
  // Podcast metadata fetching not implemented yet
  return []
}

export async function getCookie(): Promise<string> {
  // Returns the Supabase session access token for authenticating upload requests
  const { createClient } = await import('@/shared/utils/supabase/server')
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ?? ''
}

const CheckExistingBookSchema = z.object({
  title: z.string().max(256),
  author: z.string().max(300),
  libraryId: z.string().uuid(),
  mediaType: z.enum(['book', 'podcast']),
})

export async function checkExistingBook(
  title: string,
  author: string,
  libraryId: string,
  mediaType: string
): Promise<string | undefined> {
  try {
    const validated = CheckExistingBookSchema.parse({ title, author, libraryId, mediaType })
    const { checkExistingBook: apiCheckExistingBook } = await import('@/shared/lib/api/items')
    const { mediaId } = await apiCheckExistingBook(
      validated.title,
      validated.author,
      validated.libraryId,
      validated.mediaType
    )
    return mediaId || undefined
  } catch (err) {
    console.error('[upload/actions] checkExistingBook failed:', err)
    return undefined
  }
}
