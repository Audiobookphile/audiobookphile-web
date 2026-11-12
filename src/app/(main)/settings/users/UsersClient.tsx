'use client'

import { useUser } from '@/shared/contexts/UserContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { Profile } from '@/types'
import SettingsContent from '../SettingsContent'
import UsersTable from './UsersTable'

interface UsersClientProps {
  profiles: Profile[]
}

export default function UsersClient({ profiles }: UsersClientProps) {
  const t = useTypeSafeTranslations()
  const { serverSettings } = useUser()

  return (
    <SettingsContent
      title={t('HeaderUsers')}
      moreInfoUrl="https://www.audiobookphile.org/guides/users"
      entityCount={profiles.length}
    >
      <UsersTable
        profiles={profiles}
        dateFormat={serverSettings.dateFormat ?? 'MM/dd/yyyy'}
        timeFormat={serverSettings.timeFormat ?? 'HH:mm'}
      />
    </SettingsContent>
  )
}
