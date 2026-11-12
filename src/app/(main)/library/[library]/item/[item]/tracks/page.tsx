import { getCurrentUser, getLibraryItem } from '@/shared/lib/api'

export const dynamic = 'force-dynamic'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default async function TracksPage({ params }: { params: Promise<{ item: string; library: string }> }) {
  const { item: itemId } = await params

  let libraryItem, currentUser
  try {
    ;[libraryItem, currentUser] = await Promise.all([getLibraryItem(itemId), getCurrentUser()])
  } catch (err) {
    console.error('Error getting library item or user data', err)
    return null
  }

  if (!libraryItem || !currentUser) {
    console.error('Error getting library item or user data')
    return null
  }

  return (
    <div className="flex w-full flex-col gap-4 p-8">
      <div className="rounded border bg-black p-2">
        <pre className="overflow-x-auto text-sm whitespace-pre-wrap">{JSON.stringify(libraryItem, null, 2)}</pre>
      </div>
      <div className="rounded border bg-black p-2">
        <pre className="overflow-x-auto text-sm whitespace-pre-wrap">{JSON.stringify(currentUser, null, 2)}</pre>
      </div>
    </div>
  )
}
