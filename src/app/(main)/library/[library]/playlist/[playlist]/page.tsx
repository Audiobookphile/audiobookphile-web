import { getCurrentUser, getPlaylist } from '@/shared/lib/api'
import PlaylistClient from './PlaylistClient'

export const dynamic = 'force-dynamic'

// See: https://nextjs.org/docs/app/guides/adopting-partial-prefetching

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default async function PlaylistPage({ params }: { params: Promise<{ playlist: string; library: string }> }) {
  const { playlist: playlistId } = await params

  let playlist, currentUser
  try {
    ;[playlist, currentUser] = await Promise.all([getPlaylist(playlistId), getCurrentUser()])
  } catch (err) {
    console.error('Error getting playlist or user data', err)
    return null
  }

  if (!playlist || !currentUser) {
    console.error('Error getting playlist or user data')
    return null
  }

  return (
    <div className="w-full p-8">
      <PlaylistClient playlist={playlist} />
    </div>
  )
}
