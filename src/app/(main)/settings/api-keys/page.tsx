import { ExternalLink } from 'lucide-react'
import { getTypeSafeTranslations } from '@/shared/lib/getTypeSafeTranslations'
import SettingsContent from '../SettingsContent'

export const dynamic = 'force-dynamic'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default async function ApiKeysPage() {
  const t = await getTypeSafeTranslations()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const isSupabaseCloud = supabaseUrl.includes('.supabase.co')
  const projectRef = isSupabaseCloud ? supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] : null
  const dashboardHref =
    isSupabaseCloud && projectRef
      ? `https://supabase.com/dashboard/project/${projectRef}/settings/api`
      : supabaseUrl.replace(':8000', ':54323').replace('/v1', '')

  return (
    <SettingsContent title={t('HeaderApiKeys')}>
      <div className="space-y-4 p-6">
        <p className="text-sm text-foreground-muted">
          API keys for this deployment are managed in your Supabase dashboard.
        </p>
        <div className="bg-bg-light space-y-3 rounded-lg border border-border p-4">
          <h3 className="font-medium text-foreground">Supabase API Keys</h3>
          <p className="text-sm text-foreground-muted">
            Use the Supabase dashboard to manage your project API keys, create service role keys, and configure Row
            Level Security policies.
          </p>
          <a
            href={dashboardHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/20 px-5 py-2.5 text-sm font-black tracking-widest text-primary uppercase transition-all hover:scale-105 hover:bg-primary/30 active:scale-95"
          >
            <ExternalLink size={16} />
            Open API Settings
          </a>
        </div>
        {projectRef && (
          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
            <h3 className="text-[11px] font-black tracking-widest text-white/40 uppercase">Project Reference</h3>
            <code className="block rounded-xl border border-white/5 bg-black/40 p-4 font-mono text-xs text-primary/80">
              {projectRef}
            </code>
          </div>
        )}
      </div>
    </SettingsContent>
  )
}
