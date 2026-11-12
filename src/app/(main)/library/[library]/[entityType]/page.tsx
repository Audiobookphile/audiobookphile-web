import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import {
  getLibraries,
  getLibraryAuthors,
  getLibraryCollections,
  getLibraryItems,
  getLibraryPlaylists,
  getLibrarySeries,
} from '@/shared/lib/api'
import { resolveLibraryFromParam } from '@/shared/lib/library-slugs'
import { EntityType } from '@/types/api'
import BookshelfClient from './BookshelfClient'

export const dynamic = 'force-dynamic'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

async function fetchInitialData(
  entityType: EntityType,
  libraryId: string,
  searchParams: { [key: string]: string | string[] | undefined }
) {
  const params = new URLSearchParams()
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value === undefined) return
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, v))
    } else {
      params.append(key, value)
    }
  })
  const query = params.toString()
  // 50 is a safe default limit for initial load
  const fullQuery = query ? `${query}&` : ''
  let queryParams = `${fullQuery}limit=50&page=0&minified=1`
  if (entityType === 'items') {
    queryParams += '&include=rssfeed,numEpisodesIncomplete,share'
  }

  try {
    switch (entityType) {
      case 'items':
        return await getLibraryItems(libraryId, queryParams)
      case 'series':
        return await getLibrarySeries(libraryId, queryParams)
      case 'collections':
        return await getLibraryCollections(libraryId, queryParams)
      case 'playlists':
        return await getLibraryPlaylists(libraryId, queryParams)
      case 'authors':
        return await getLibraryAuthors(libraryId, queryParams)
      default:
        return null
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'UnauthorizedError') {
      redirect('/login')
    }
    console.error(`Failed to fetch initial data for ${entityType}:`, error)
    return null
  }
}

export default async function EntityPage({
  params,
  searchParams,
}: {
  params: Promise<{ library: string; entityType: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { library: libraryParam, entityType: entityTypeString } = await params
  const resolvedSearchParams = await searchParams
  const entityType = entityTypeString as EntityType

  let libraryId = libraryParam
  try {
    const response = await getLibraries()
    const libraries = Array.isArray(response?.libraries) ? response.libraries : []
    const resolved = resolveLibraryFromParam(libraryParam, libraries)
    if (resolved) {
      libraryId = resolved.library.id
    }
  } catch (err) {
    // Layout already resolves/redirects unknown slugs; keep the raw param as a
    // best-effort libraryId only when the param is already a UUID.
    console.error('Failed to resolve library param for entity page', err)
  }

  const initialData = await fetchInitialData(entityType, libraryId, resolvedSearchParams)

  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <BookshelfClient key={entityType} entityType={entityType} initialData={initialData} />
      </Suspense>
    </div>
  )
}
