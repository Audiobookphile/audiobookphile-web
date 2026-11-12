import { Suspense } from 'react'
import { UserDataFetcher } from './UserDataFetcher'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <UserDataFetcher>{children}</UserDataFetcher>
    </Suspense>
  )
}
