import { redirect } from 'next/navigation'
import AdminAnalyticsWidget from '@/features/admin/components/AdminAnalyticsWidget'
import { getCurrentUser } from '@/shared/lib/api/users'

export const dynamic = 'force-dynamic'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default async function AnalyticsPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser?.user || !['admin', 'root'].includes(currentUser.user.type)) {
    return redirect('/')
  }

  return (
    <div className="w-full max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Server Analytics</h1>
        <p className="text-foreground-muted">Monitor your server&apos;s health and user activity.</p>
      </div>

      <AdminAnalyticsWidget />
    </div>
  )
}
