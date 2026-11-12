import { getTypeSafeTranslations } from '@/shared/lib/getTypeSafeTranslations'
import SettingsContent from '../SettingsContent'

export const dynamic = 'force-dynamic'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default async function NotificationsPage() {
  const t = await getTypeSafeTranslations()

  return (
    <SettingsContent title={t('HeaderNotifications')}>
      <div className="p-6">
        <p className="text-sm text-foreground-muted">
          Push notifications and webhooks are not available in this version. Email notifications are handled through
          Supabase Auth email templates.
        </p>
      </div>
    </SettingsContent>
  )
}
