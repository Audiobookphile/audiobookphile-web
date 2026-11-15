'use client'

import { BookOpen, Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { useGlobalToast } from '@/shared/contexts/ToastContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import Btn from '@/shared/ui/Btn'
import { RssFeed } from '@/types/api'
import SettingsContent from '../SettingsContent'
import RssFeedsTable from './RssFeedsTable'

interface RssFeedsClientProps {
  rssFeeds: RssFeed[]
}

export default function RssFeedsClient({ rssFeeds }: RssFeedsClientProps) {
  const t = useTypeSafeTranslations()
  const { showToast } = useGlobalToast()
  const [copiedOpds, setCopiedOpds] = useState(false)

  const opdsUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/opds` : 'https://audiobookphile.app/api/opds'

  const handleCopyOpds = async () => {
    try {
      await navigator.clipboard.writeText(opdsUrl)
      setCopiedOpds(true)
      showToast('OPDS Catalog URL copied to clipboard', { type: 'success' })
      setTimeout(() => setCopiedOpds(false), 2000)
    } catch {
      showToast('Failed to copy OPDS URL', { type: 'error' })
    }
  }

  return (
    <SettingsContent title={t('HeaderRSSFeeds')} moreInfoUrl="https://www.audiobookphile.org/guides/rss_feeds">
      <div className="mb-6 rounded-2xl border border-border/40 bg-card/60 p-5 backdrop-blur-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">OPDS 1.2 Open Catalog Feed</h3>
              <p className="mt-0.5 text-xs text-foreground-muted">
                Connect external e-readers and audio players (such as BookPlayer on iOS, Aldiko, or FBReader) using your account credentials.
              </p>
              <code className="mt-2 inline-block rounded-md bg-background-elevated px-2 py-1 text-xs text-foreground-muted">
                {opdsUrl}
              </code>
            </div>
          </div>
          <Btn
            size="small"
            className="shrink-0 gap-1.5"
            onClick={handleCopyOpds}
          >
            {copiedOpds ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedOpds ? 'Copied' : 'Copy OPDS URL'}
          </Btn>
        </div>
      </div>

      <RssFeedsTable rssFeeds={rssFeeds} />
    </SettingsContent>
  )
}
