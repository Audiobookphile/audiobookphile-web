'use client'

import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { RssFeed } from '@/types/api'
import SettingsContent from '../SettingsContent'
import RssFeedsTable from './RssFeedsTable'

interface RssFeedsClientProps {
  rssFeeds: RssFeed[]
}

export default function RssFeedsClient({ rssFeeds }: RssFeedsClientProps) {
  const t = useTypeSafeTranslations()
  return (
    <SettingsContent title={t('HeaderRSSFeeds')} moreInfoUrl="https://www.audiobookphile.org/guides/rss_feeds">
      <RssFeedsTable rssFeeds={rssFeeds} />
    </SettingsContent>
  )
}
