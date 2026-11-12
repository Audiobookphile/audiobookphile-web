import { ArrowLeft, Settings, ShieldAlert, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import AdminAnalyticsWidget from '@/features/admin/components/AdminAnalyticsWidget'
import { AdminInvitePanel } from '@/features/admin/components/AdminInvitePanel'
import { getCurrentUser } from '@/shared/lib/api'

export const dynamic = 'force-dynamic'

// See: https://nextjs.org/docs/app/guides/adopting-partial-prefetching

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default async function AdminDashboardPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser?.user || !['admin', 'root'].includes(currentUser.user.type)) {
    return redirect('/')
  }

  const roleBadge = currentUser.user.type === 'root' ? 'ROOT ADMINISTRATOR' : 'ADMINISTRATOR'

  return (
    <div className="mx-auto w-full max-w-6xl p-6 md:p-10">
      {/* Bleeding-Edge Navigation Banner */}
      <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-border bg-primary/80 p-4 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/library"
            className="group inline-flex items-center gap-2 rounded-xl border border-border bg-primary px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-all hover:border-accent/40 hover:bg-primary-hover hover:shadow-md"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Return to Library</span>
          </Link>

          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-primary/50 px-4 py-2.5 text-sm font-medium text-foreground-muted transition-all hover:border-border hover:bg-primary hover:text-foreground"
          >
            <Settings className="h-4 w-4 text-foreground-muted" />
            <span>Server Settings</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/15 px-3 py-1 text-xs font-bold tracking-wider text-accent uppercase">
            <ShieldAlert className="h-3.5 w-3.5 text-accent" />
            <span>{roleBadge}</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>Live System</span>
          </span>
        </div>
      </div>

      {/* Dashboard Title & Intro */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">Admin Dashboard</h1>
        <p className="mt-2 text-base text-foreground-muted">
          Real-time server telemetry, active sessions, and user invite management.
        </p>
      </div>

      {/* Analytics Telemetry Grid (client-fetched) */}
      <div className="mb-12">
        <h2 className="mb-4 text-xs font-bold tracking-wider text-foreground-subdued uppercase">System Analytics</h2>
        <AdminAnalyticsWidget />
      </div>

      {/* User Management & Invitations */}
      <div className="rounded-2xl border border-border bg-primary/80 p-6 backdrop-blur-xl">
        <h2 className="mb-1 text-xl font-bold tracking-tight text-foreground">User Management</h2>
        <p className="mb-6 text-sm text-foreground-muted">
          Invite new members to your server. Newly invited users will receive an enrollment token via email.
        </p>
        <div className="max-w-xl">
          <AdminInvitePanel />
        </div>
      </div>
    </div>
  )
}
