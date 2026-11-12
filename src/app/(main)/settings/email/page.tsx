import { ExternalLink } from 'lucide-react'
import { getTypeSafeTranslations } from '@/shared/lib/getTypeSafeTranslations'
import { getSupabaseUrl } from '@/shared/utils/supabase/env'
import SettingsContent from '../SettingsContent'

export const dynamic = 'force-dynamic'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default async function EmailPage() {
  const t = await getTypeSafeTranslations()
  const supabaseUrl = getSupabaseUrl()
  const isSupabaseCloud = supabaseUrl.includes('.supabase.co')
  const projectRef = isSupabaseCloud ? supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] : null

  const getHref = (path: string) => {
    return isSupabaseCloud && projectRef
      ? `https://supabase.com/dashboard/project/${projectRef}/${path}`
      : supabaseUrl.replace(':8000', ':54323').replace('/v1', '')
  }

  return (
    <SettingsContent title={t('HeaderEmail')}>
      <div className="space-y-4 p-6">
        <p className="text-sm text-foreground-muted">
          Email sending is handled by Supabase Auth. Configure SMTP settings and email templates in your dashboard.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label: 'Custom SMTP', desc: 'Configure your email provider', path: 'auth/smtp' },
            { label: 'Email Templates', desc: 'Customize auth emails', path: 'auth/templates' },
          ].map((item) => (
            <a
              key={item.path}
              href={getHref(item.path)}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all hover:scale-[1.02] hover:border-primary/50 active:scale-[0.98]"
            >
              <div className="rounded-xl bg-primary/20 p-3 transition-colors group-hover:bg-primary/30">
                <ExternalLink size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-black tracking-widest text-white/90 uppercase">{item.label}</p>
                <p className="mt-1 text-xs text-white/40">{item.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </SettingsContent>
  )
}
