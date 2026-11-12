import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LibraryProvider } from '@/features/library/contexts/LibraryContext'
import { getLibraries } from '@/shared/lib/api'
import { resolveLibraryFromParam } from '@/shared/lib/library-slugs'
import AppBar from '../../AppBar'
import LibraryLayoutWrapper from './LibraryLayoutWrapper'

export const dynamic = 'force-dynamic'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export const metadata: Metadata = {
  title: 'audiobookphile',
  description: 'audiobookphile',
}

export default async function LibraryLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ library: string }>
}>) {
  const { library: paramValue } = await params

  let libraries: import('@/types/api').Library[] = []
  try {
    const response = await getLibraries()
    libraries = response.libraries
  } catch (err) {
    console.error('Error getting library data', err)
    redirect('/')
  }

  const resolved = resolveLibraryFromParam(paramValue, libraries)
  if (!resolved) {
    console.error('Error getting library data: unknown slug or id', paramValue)
    redirect('/')
  }

  const currentLibrary = resolved.library

  return (
    <LibraryProvider library={currentLibrary}>
      <AppBar libraries={libraries} currentLibraryId={currentLibrary.id} />
      <LibraryLayoutWrapper>{children}</LibraryLayoutWrapper>
    </LibraryProvider>
  )
}
