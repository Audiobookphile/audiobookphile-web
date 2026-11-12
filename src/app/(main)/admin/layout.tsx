import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/shared/lib/api/users'
import AppBar from '../AppBar'

export const dynamic = 'force-dynamic'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export const metadata: Metadata = {
  title: 'audiobookphile - Admin Dashboard',
  description: 'audiobookphile server administration and telemetry',
}

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const currentUser = await getCurrentUser()

  if (!currentUser?.user || !['admin', 'root'].includes(currentUser.user.type)) {
    redirect('/')
  }

  return (
    <>
      <AppBar />
      <div className="page-wrapper relative flex overflow-hidden">
        <div className="page-bg-gradient h-[calc(100vh-4rem)] min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  )
}
