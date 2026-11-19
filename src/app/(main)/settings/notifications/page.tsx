import { getNotificationsAction } from './actions'
import NotificationsClient from './NotificationsClient'
import { getTypeSafeTranslations } from '@/shared/lib/getTypeSafeTranslations'
import SettingsContent from '../SettingsContent'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const t = await getTypeSafeTranslations()
  const initialNotifications = await getNotificationsAction()

  return (
    <SettingsContent title={t('HeaderNotifications') || 'Notifications & Webhooks'}>
      <NotificationsClient initialNotifications={initialNotifications} />
    </SettingsContent>
  )
}
