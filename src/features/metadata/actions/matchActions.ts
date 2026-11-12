'use server'

import type {
  BookSearchResult,
  PodcastSearchResult,
  UpdateLibraryItemMediaPayload,
  UpdateLibraryItemMediaResponse,
} from '@/types/api'

/**
 * Search for book metadata using Open Library and Google Books.
 */
/**
 * The part of the Google Books volumes response this app reads.
 */
type GoogleBooksResponse = {
  items?: {
    volumeInfo?: {
      title?: string
      authors?: string[]
      description?: string
      imageLinks?: { thumbnail?: string }
      categories?: string[]
      industryIdentifiers?: { type?: string; identifier?: string }[]
      language?: string
      publisher?: string
      publishedDate?: string
    }
  }[]
}

export async function searchBooksAction(
  _provider: string,
  title: string,
  author?: string,
  _libraryItemId?: string
): Promise<BookSearchResult[]> {
  const results: BookSearchResult[] = []

  try {
    // Open Library
    const query = new URLSearchParams({ title, limit: '8' })
    if (author) query.set('author', author)
    const olRes = await fetch(`https://openlibrary.org/search.json?${query}`, {
      signal: AbortSignal.timeout(8000),
    })
    if (olRes.ok) {
      interface OpenLibraryDoc {
        title?: string
        author_name?: string[]
        first_sentence?: { value?: string }
        cover_i?: number | string
        subject?: string[]
        isbn?: string[]
        language?: string[]
        publisher?: string[]
        first_publish_year?: number | string
      }
      const data = (await olRes.json()) as { docs?: OpenLibraryDoc[] }
      for (const doc of (data?.docs || []).slice(0, 8)) {
        results.push({
          title: doc.title || title,
          author: doc.author_name?.[0] || author || '',
          description: doc.first_sentence?.value || '',
          cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : undefined,
          series: [],
          genres: doc.subject?.slice(0, 3) || [],
          tags: [],
          isbn: doc.isbn?.[0] || undefined,
          asin: undefined,
          language: doc.language?.[0] || undefined,
          publisher: doc.publisher?.[0] || undefined,
          publishedYear: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
          narrator: undefined,
          explicit: false,
          abridged: false,
        })
      }
    }
  } catch (err) {
    console.error('[matchActions] searchBooks OL failed:', err)
  }

  // Google Books fallback / supplement
  if (results.length < 4) {
    try {
      const q = author ? `intitle:${title}+inauthor:${author}` : `intitle:${title}`
      const gbRes = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=8&printType=books`,
        {
          signal: AbortSignal.timeout(8000),
        }
      )
      if (gbRes.ok) {
        // The Google Books response has a shape this app depends on, so it is
        // named rather than left as the `any` that `json()` returns.
        const data = (await gbRes.json()) as GoogleBooksResponse
        for (const item of (data?.items || []).slice(0, 8)) {
          const info = item.volumeInfo || {}
          const thumbnail = info.imageLinks?.thumbnail?.replace('http://', 'https://') || null
          results.push({
            title: info.title || title,
            author: info.authors?.[0] || author || '',
            description: info.description || '',
            cover: thumbnail || undefined,
            series: [],
            genres: info.categories?.slice(0, 3) || [],
            tags: [],
            isbn: info.industryIdentifiers?.find((i) => i.type === 'ISBN_13')?.identifier || undefined,
            asin: undefined,
            language: info.language || undefined,
            publisher: info.publisher || undefined,
            publishedYear: info.publishedDate?.slice(0, 4) || undefined,
            narrator: undefined,
            explicit: false,
            abridged: false,
          })
        }
      }
    } catch (err) {
      console.error('[matchActions] searchBooks GB failed:', err)
    }
  }

  return results.slice(0, 12)
}

export async function searchPodcastsAction(_term: string): Promise<PodcastSearchResult[]> {
  return []
}

/**
 * Apply matched metadata to a library item — updates books table and optionally fetches cover.
 */
export async function applyMatchAction(
  libraryItemId: string,
  updatePayload: UpdateLibraryItemMediaPayload
): Promise<UpdateLibraryItemMediaResponse> {
  const { apiRequest } = await import('@/shared/lib/api')

  try {
    // Update metadata using Edge Function
    await apiRequest(`/api/items/${libraryItemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ metadata: updatePayload.metadata }),
    })

    // Fetch and save cover if provided
    if (updatePayload.cover) {
      try {
        const { updateCoverFromUrlAction } = await import('@/features/metadata/actions/coverActions')
        await updateCoverFromUrlAction(libraryItemId, updatePayload.cover)
      } catch (err) {
        console.warn('[matchActions] cover fetch failed:', err)
      }
    } else if (updatePayload.metadata?.title) {
      // Auto-fetch cover if none provided
      const authorData = updatePayload.metadata.authors?.[0]
      const authorName = (typeof authorData === 'string' ? authorData : authorData?.name) || undefined
      const { autoFetchCoverAction } = await import('@/features/metadata/actions/coverActions')
      await autoFetchCoverAction(libraryItemId, updatePayload.metadata.title, authorName)
    }

    return { updated: true }
  } catch (err) {
    console.error('[matchActions] applyMatch failed:', err)
    throw err
  }
}
