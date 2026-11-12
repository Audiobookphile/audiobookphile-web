import { apiRequest } from '@/shared/lib/api/client'
import NarratorsClient from './NarratorsClient'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default async function NarratorsPage({ params }: { params: Promise<{ library: string }> }) {
  const { library: libraryId } = await params

  // Narrators are stored in book_narrators joined with a narrators table (if it exists)
  // Fall back to empty array if the table doesn't exist
  let narrators: { id: string; name: string }[]
  try {
    const { narrators: fetchedNarrators } = await apiRequest<{ narrators: { id: string; name: string }[] }>(
      `/api/libraries/${libraryId}/narrators`
    )
    narrators = fetchedNarrators ?? []
  } catch {
    narrators = []
  }

  return (
    <div className="w-full p-8">
      <NarratorsClient libraryId={libraryId} narrators={narrators} />
    </div>
  )
}
