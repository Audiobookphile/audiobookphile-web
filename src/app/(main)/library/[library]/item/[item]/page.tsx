import { getLibraryItem } from '@/shared/lib/api'
import { BookLibraryItem, PodcastLibraryItem } from '@/types/api'
import LibraryItemClient from './LibraryItemClient'

export const dynamic = 'force-dynamic'

// See: https://nextjs.org/docs/app/guides/adopting-partial-prefetching

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default async function ItemPage({ params }: { params: Promise<{ item: string; library: string }> }) {
  const { item: itemId } = await params

  let libraryItem
  try {
    libraryItem = await getLibraryItem(itemId)
  } catch (err) {
    console.error('Error getting library item', err)
    return null
  }

  if (!libraryItem) {
    console.error('Error getting library item')
    return null
  }

  return (
    <div className="w-full p-6 sm:p-8">
      <LibraryItemClient libraryItem={libraryItem as BookLibraryItem | PodcastLibraryItem} />
    </div>
  )
}
