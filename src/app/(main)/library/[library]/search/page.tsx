import { searchLibrary } from '@/shared/lib/api'
import SearchClient from './SearchClient'

export const dynamic = 'force-dynamic'

// See: https://nextjs.org/docs/app/guides/adopting-partial-prefetching

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ library: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const { library: libraryId } = await params
  const { q: query } = await searchParams

  let results: Awaited<ReturnType<typeof searchLibrary>> | null = null
  if (query && query.trim().length > 0) {
    try {
      results = await searchLibrary(libraryId, query.trim(), 24)
    } catch (err) {
      console.error('Search failed:', err)
    }
  }

  return <SearchClient libraryId={libraryId} initialQuery={query ?? ''} initialResults={results} />
}
