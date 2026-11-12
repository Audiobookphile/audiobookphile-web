import { getLibraries, getLibraryItems, getSeries } from '@/shared/lib/api'
import { resolveLibraryFromParam } from '@/shared/lib/library-slugs'
import SeriesClient from './SeriesClient'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default async function SeriesPage({ params }: { params: Promise<{ series: string; library: string }> }) {
  const { series: seriesId, library: libraryParam } = await params

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
    console.error('Failed to resolve library param for series page', err)
  }

  let series, libraryItems
  try {
    ;[series, libraryItems] = await Promise.all([getSeries(libraryId, seriesId), getLibraryItems(libraryId)])
  } catch (err) {
    console.error('Error getting series or library items data', err)
    return null
  }

  if (!series || !libraryItems) {
    console.error('Error getting series or library items data')
    return null
  }

  return (
    <div className="w-full p-8">
      <SeriesClient series={series} libraryItems={libraryItems} />
    </div>
  )
}
