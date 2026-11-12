import { getLibraries } from '@/shared/lib/api'
import UploadClient from './UploadClient'

export const dynamic = 'force-dynamic'

// See: https://nextjs.org/docs/app/guides/adopting-partial-prefetching

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default async function UploadPage() {
  let libraries: import('@/types/api').Library[]
  try {
    const response = await getLibraries()
    libraries = response.libraries
  } catch {
    libraries = []
  }
  return <UploadClient libraries={libraries} />
}
