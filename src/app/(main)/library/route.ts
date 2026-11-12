import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/shared/lib/api'
import { getLibraries } from '@/shared/lib/api/libraries'
import { getLibrarySlug } from '@/shared/lib/library-slugs'

/**
 * GET /library
 * Redirects to the user's default library (or first available), or settings/account page.
 */
export const GET = async () => {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return redirect('/login?error=no_session')
    }

    let libraryId = currentUser.userDefaultLibraryId
    const userType = currentUser.user.type
    let allLibraries: import('@/types/api').Library[] = []

    try {
      const libs = await getLibraries()
      allLibraries = libs?.libraries || []
      console.log('[library/route.ts] libs:', JSON.stringify(libs))
      if (!libraryId && allLibraries.length > 0) {
        libraryId = allLibraries[0].id
      }
    } catch (err) {
      console.error('[library/route.ts] getLibraries error:', err)
      // Silently ignore and fall through
    }

    if (libraryId) {
      const targetLib = allLibraries.find((lib) => lib.id === libraryId)
      const slug = targetLib ? getLibrarySlug(targetLib, allLibraries) : libraryId
      return redirect(`/library/${slug}`)
    }

    if (['admin', 'root'].includes(userType)) {
      return redirect('/settings')
    }

    return redirect('/account')
  } catch (error) {
    // Re-throw redirect errors
    if (
      error &&
      typeof error === 'object' &&
      'digest' in error &&
      typeof error.digest === 'string' &&
      error.digest.includes('NEXT_REDIRECT')
    ) {
      throw error
    }
    return redirect('/login?error=unauthorized')
  }
}
