import { getRssFeeds } from '@/shared/lib/api/items-modules/system'
import type { RssFeed } from '@/types/api'
import RssFeedsClient from './RssFeedsClient'

export const dynamic = 'force-dynamic'

export default async function RssFeedsPage() {
  let feeds: RssFeed[] = []
  try {
    const res = await getRssFeeds()
    feeds = res?.feeds ?? []
  } catch (err) {
    console.error('Failed to load RSS feeds', err)
  }

  return <RssFeedsClient rssFeeds={feeds} />
}
