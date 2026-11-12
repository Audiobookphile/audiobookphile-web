import { cookies } from 'next/headers'
import { getCurrentUser } from '@/shared/lib/api'
import { getTypeSafeTranslations } from '@/shared/lib/getTypeSafeTranslations'
import { getTheme } from '@/shared/lib/theme'
import Btn from '@/shared/ui/Btn'
import TextInput from '@/shared/ui/TextInput'
import LogoutBtn from './LogoutBtn'
import ThemeSelector from './ThemeSelector'
import UserLanguageSelector from './UserLanguageSelector'

export const dynamic = 'force-dynamic'

// See: https://nextjs.org/docs/app/guides/adopting-partial-prefetching

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default async function AccountPage() {
  let currentUser
  try {
    currentUser = await getCurrentUser()
  } catch {
    return null
  }

  const t = await getTypeSafeTranslations()

  // Get current language from cookies (userLanguage takes precedence over language)
  const cookieStore = await cookies()
  const currentLanguage = cookieStore.get('userLanguage')?.value || cookieStore.get('language')?.value || 'en-us'

  // Get current theme
  const currentTheme = await getTheme()

  if (!currentUser?.user) {
    return null
  }

  const user = currentUser.user

  return (
    <div className="mx-auto w-full max-w-xl p-8">
      <h1 className="text-xl">{t('HeaderAccount')}</h1>

      <div className="mt-8 flex flex-col items-start gap-4">
        <div className="flex w-full items-center gap-2">
          <div className="flex-2">
            <TextInput value={user.username ?? ''} label={t('LabelUsername')} readOnly />
          </div>
          <div className="flex-1">
            <TextInput value={user.type} label={t('LabelAccountType')} readOnly />
          </div>
        </div>
        <div className="w-full">
          <UserLanguageSelector value={currentLanguage} label={t('LabelLanguage')} />
        </div>
        <div className="w-full">
          <ThemeSelector value={currentTheme} label={t('LabelTheme')} />
        </div>
        <div className="h-px w-full bg-border" />
        <div className="flex w-full items-center justify-between">
          <Btn to="/account/change-password">{t('LabelChangePassword')}</Btn>
          <LogoutBtn />
        </div>
      </div>
    </div>
  )
}
