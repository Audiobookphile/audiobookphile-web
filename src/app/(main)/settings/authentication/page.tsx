import { ExternalLink } from 'lucide-react'
import TwoFactorSettingsPanel from '@/features/auth/components/TwoFactorSettingsPanel'
import { getTypeSafeTranslations } from '@/shared/lib/getTypeSafeTranslations'
import { createClient } from '@/shared/utils/supabase/server'
import SettingsContent from '../SettingsContent'

export const dynamic = 'force-dynamic'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default async function AuthenticationPage() {
  const t = await getTypeSafeTranslations()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  let is2faEnabled = false
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('is_2fa_enabled').eq('id', user.id).maybeSingle()
    is2faEnabled = profile?.is_2fa_enabled === true
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const isSupabaseCloud = supabaseUrl.includes('.supabase.co')
  const projectRef = isSupabaseCloud ? supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] : null

  const getHref = (path: string) => {
    return isSupabaseCloud && projectRef
      ? `https://supabase.com/dashboard/project/${projectRef}/${path}`
      : supabaseUrl.replace(':8000', ':54323').replace('/v1', '')
  }

  return (
    <SettingsContent title={t('HeaderAuthentication')}>
      <div className="space-y-6 p-6">
        <TwoFactorSettingsPanel initialEnabled={is2faEnabled} />

        <p className="text-sm text-foreground-muted">
          Authentication is handled by Supabase Auth. Configure providers, email templates, and security settings in
          your dashboard.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label: 'Auth Providers', desc: 'Google, email, magic link', path: 'auth/providers' },
            { label: 'Email Templates', desc: 'Confirmation, reset password', path: 'auth/templates' },
            { label: 'URL Configuration', desc: 'Redirect URLs, site URL', path: 'auth/url-configuration' },
            { label: 'Users', desc: 'View and manage users', path: 'auth/users' },
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
