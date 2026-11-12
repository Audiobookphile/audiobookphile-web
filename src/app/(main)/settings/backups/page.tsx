import { Database, ExternalLink, Terminal } from 'lucide-react'
import { getTypeSafeTranslations } from '@/shared/lib/getTypeSafeTranslations'
import SettingsContent from '../SettingsContent'

export const dynamic = 'force-dynamic'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default async function BackupsPage() {
  const t = await getTypeSafeTranslations()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const isSupabaseCloud = supabaseUrl.includes('.supabase.co')
  const projectRef = isSupabaseCloud ? supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] : null
  const dashboardHref =
    isSupabaseCloud && projectRef
      ? `https://supabase.com/dashboard/project/${projectRef}/database/backups/scheduled`
      : supabaseUrl.replace(':8000', ':54323').replace('/v1', '')

  return (
    <SettingsContent title={t('HeaderBackups')}>
      <div className="space-y-4 p-6">
        <p className="text-sm text-foreground-muted">
          Database backups are managed by Supabase. You can download a backup or restore from your dashboard.
        </p>
        <div className="bg-bg-light space-y-3 rounded-lg border border-border p-4">
          <h3 className="font-medium text-foreground">Supabase Managed Backups</h3>
          <p className="text-sm text-foreground-muted">
            Supabase automatically backs up your database daily on paid plans. Point-in-time recovery is available on
            Pro and above.
          </p>
          <a
            href={dashboardHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/20 px-5 py-2.5 text-sm font-black tracking-widest text-primary uppercase transition-all hover:scale-105 hover:bg-primary/30 active:scale-95"
          >
            <ExternalLink size={16} />
            Open Backups
          </a>
        </div>
        {projectRef ? (
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <Terminal size={18} className="text-primary" />
              <h3 className="text-[11px] font-black tracking-widest text-white/40 uppercase">Manual Export</h3>
            </div>
            <p className="text-sm text-white/60">You can export your data using the Supabase SQL editor or the CLI:</p>
            <code className="block rounded-xl border border-white/5 bg-black/40 p-4 font-mono text-xs text-primary/80">
              supabase db dump --project-ref {projectRef} &gt; backup.sql
            </code>
          </div>
        ) : (
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <Database size={18} className="text-primary" />
              <h3 className="text-[11px] font-black tracking-widest text-white/40 uppercase">Self-Hosted</h3>
            </div>
            <p className="text-sm text-white/60">
              You are running a self-hosted instance. Use standard Postgres dump tools (pg_dump) against your database
              URL.
            </p>
          </div>
        )}
      </div>
    </SettingsContent>
  )
}
