import { redirect } from 'next/navigation'
import { apiFetch } from '@/shared/lib/api/client'
import { normalizeShelves } from '@/shared/lib/library-shelves'
import { getLibrarySlug, resolveLibraryFromParam } from '@/shared/lib/library-slugs'
import type { GetLibrariesResponse, PersonalizedShelf } from '@/types/api'
import LibraryClient from './LibraryClient'

export const dynamic = 'force-dynamic'

// See: https://nextjs.org/docs/app/guides/adopting-partial-prefetching

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

// Continue Listening and personalized shelves are per-user and per-session —
// never serve a cached version. Force dynamic rendering so every page load
// hits the edge function with fresh progress data.

export default async function LibraryPage({ params }: { params: Promise<{ library: string }> }) {
  const { library: paramValue } = await params

  let libraryId = paramValue
  const librariesResult = await apiFetch<GetLibrariesResponse>('/api/libraries', {})
  if (librariesResult.ok) {
    const response = librariesResult.data
    const libraries = Array.isArray(response?.libraries) ? response.libraries : []
    const resolved = resolveLibraryFromParam(paramValue, libraries)
    if (resolved) {
      if (resolved.isUuidRedirect) {
        const canonicalSlug = getLibrarySlug(resolved.library, libraries)
        redirect(`/library/${canonicalSlug}`)
      }
      libraryId = resolved.library.id
    }
  }

  const personalizedResult = await apiFetch<PersonalizedShelf[]>(
    `/api/libraries/${libraryId}/personalized?include=rssfeed,share`,
    {}
  )

  const personalizedData = personalizedResult.ok ? personalizedResult.data : undefined
  const shelves: PersonalizedShelf[] = normalizeShelves(personalizedData)

  if (!personalizedResult.ok && !Array.isArray(personalizedData)) {
    return (
      <div className="flex w-full flex-col items-center justify-center p-12 text-center">
        <p className="text-lg font-medium">Unable to load library</p>
        <p className="mt-2 text-sm text-gray-500">
          There was a problem fetching your library data. Try refreshing the page.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <LibraryClient personalized={shelves} />
    </div>
  )
}
