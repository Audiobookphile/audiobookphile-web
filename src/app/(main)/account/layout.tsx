import type { Metadata } from 'next'
import AppBar from '../AppBar'

export const dynamic = 'force-dynamic'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export const metadata: Metadata = {
  title: 'audiobookphile',
  description: 'audiobookphile',
}

export default async function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <AppBar />
      <div className="page-bg-gradient h-[calc(100vh-4rem)]">
        <div className="h-full w-full overflow-x-hidden overflow-y-auto">{children}</div>
      </div>
    </>
  )
}
