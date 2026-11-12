import { getTypeSafeTranslations } from '@/shared/lib/getTypeSafeTranslations'
import SettingsContent from '../SettingsContent'

export const dynamic = 'force-dynamic'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default async function RssFeedsPage() {
  const t = await getTypeSafeTranslations()

  return (
    <SettingsContent title={t('HeaderRSSFeeds')}>
      <div className="p-6">
        <p className="text-sm text-foreground-muted">
          RSS feed generation is not available in this version. RSS feeds require a persistent server process to
          generate and serve feeds.
        </p>
      </div>
    </SettingsContent>
  )
}
