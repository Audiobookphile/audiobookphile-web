import type { Metadata } from 'next'
import { getLibraries } from '@/shared/lib/api'
import '../../../assets/globals.css'
import { ComponentsCatalogProvider } from '../../../shared/contexts/ComponentsCatalogContext'
import AppBar from '../AppBar'

export const dynamic = 'force-dynamic'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export const metadata: Metadata = {
  title: 'audiobookphile - Components Catalog',
  description: 'Components catalog for audiobookphile client',
}

export default async function ComponentsCatalogLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let libraries: import('@/types/api').Library[]
  try {
    const res = await getLibraries()
    libraries = res.libraries
  } catch {
    libraries = []
  }

  return (
    <>
      <AppBar libraries={libraries} />
      <ComponentsCatalogProvider libraries={libraries}>
        <div className="h-full max-h-screen w-full overflow-x-hidden overflow-y-auto">{children}</div>
      </ComponentsCatalogProvider>
    </>
  )
}
