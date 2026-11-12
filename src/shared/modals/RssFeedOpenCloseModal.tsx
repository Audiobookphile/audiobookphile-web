'use client'

import { useCallback, useEffect, useState } from 'react'
import { closeRssFeed, openEntityRssFeed } from '@/features/tools/actions/rssFeedActions'
import { useGlobalToast } from '@/shared/contexts/ToastContext'
import { useUser } from '@/shared/contexts/UserContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import Modal from '@/shared/modals/Modal'
import Btn from '@/shared/ui/Btn'
import Checkbox from '@/shared/ui/Checkbox'
import TextInput from '@/shared/ui/TextInput'
import { RssFeed } from '@/types/api'

function sanitizeSlug(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

export interface RssFeedEntity {
  id: string
  name: string
  type: 'item' | 'collection' | 'series'
  feed: RssFeed | null
  hasEpisodesWithoutPubDate?: boolean
}

interface RssFeedOpenCloseModalProps {
  isOpen: boolean
  onClose: () => void
  entity: RssFeedEntity | null
  viewMode?: boolean
  onFeedChange?: (feed: RssFeed | null) => void
}

export default function RssFeedOpenCloseModal({
  isOpen,
  onClose,
  entity,
  viewMode = false,
  onFeedChange,
}: RssFeedOpenCloseModalProps) {
  const t = useTypeSafeTranslations()
  const { showToast } = useGlobalToast()
  const { userIsAdminOrUp } = useUser()
  const [newFeedSlug, setNewFeedSlug] = useState('')
  const [metadataDetails, setMetadataDetails] = useState({
    preventIndexing: true,
    ownerName: '',
    ownerEmail: '',
  })
  const [processing, setProcessing] = useState(false)
  const [currentFeed, setCurrentFeed] = useState<RssFeed | null>(null)

  const entityId = entity?.id ?? ''
  const entityName = entity?.name ?? ''
  const entityFeed = entity?.feed ?? null
  const hasEpisodesWithoutPubDate = entity?.hasEpisodesWithoutPubDate ?? false
  const isHttp = typeof window !== 'undefined' && window.location.origin.startsWith('http://')
  const demoFeedUrl = typeof window !== 'undefined' ? `${window.location.origin}/feed/${newFeedSlug || entityId}` : ''

  useEffect(() => {
    if (isOpen && entity) {
      setNewFeedSlug(entityId)
      setCurrentFeed(entityFeed)
    }
  }, [isOpen, entity, entityId, entityFeed])

  const handleOpenFeed = useCallback(async () => {
    if (!entityId || !entity?.type) return
    if (!newFeedSlug.trim()) {
      showToast(t('ToastSlugRequired'), { type: 'error' })
      return
    }
    const sanitized = sanitizeSlug(newFeedSlug)
    if (newFeedSlug !== sanitized) {
      setNewFeedSlug(sanitized)
      showToast(t('ToastSlugMustChange'), { type: 'warning' })
      return
    }
    setProcessing(true)
    try {
      const res = await openEntityRssFeed(entity.type, entityId, {
        serverAddress: window.location.origin,
        slug: sanitized,
        metadataDetails: {
          preventIndexing: metadataDetails.preventIndexing,
          ownerName: metadataDetails.ownerName || '',
          ownerEmail: metadataDetails.ownerEmail || '',
        },
      })
      if (res && typeof res === 'object' && 'feed' in res) {
        const feed = (res as { feed: RssFeed | null }).feed
        setCurrentFeed(feed)
        onFeedChange?.(feed)
      }
    } catch (error: unknown) {
      console.error('Failed to open RSS feed', error)
      const msg =
        error && typeof error === 'object' && 'message' in error ? String((error as { message: string }).message) : null
      showToast(msg || 'Failed to open RSS feed', { type: 'error' })
    } finally {
      setProcessing(false)
    }
  }, [entity?.type, entityId, newFeedSlug, metadataDetails, onFeedChange, showToast, t])

  const handleCloseFeed = useCallback(async () => {
    if (!currentFeed) return
    setProcessing(true)
    try {
      await closeRssFeed(currentFeed.id)
      showToast(t('ToastRSSFeedCloseSuccess'), { type: 'success' })
      setCurrentFeed(null)
      onFeedChange?.(null)
      onClose()
    } catch (error) {
      console.error('Failed to close RSS feed', error)
      showToast(t('ToastRSSFeedCloseFailed'), { type: 'error' })
    } finally {
      setProcessing(false)
    }
  }, [currentFeed, onClose, onFeedChange, showToast, t])

  if (!entity) return null

  const outerContent = (
    <div className="absolute start-0 top-0 p-4">
      <p className="max-w-[calc(100vw-4rem)] truncate text-xl font-semibold text-white" title={entityName}>
        {entityName}
      </p>
    </div>
  )

  const fullFeedUrl =
    typeof window !== 'undefined' && currentFeed ? `${window.location.origin}${currentFeed.feedUrl}` : ''
  const meta = currentFeed?.meta
  const hasOwnerName = meta && meta.ownerName != null && String(meta.ownerName).trim() !== ''
  const hasOwnerEmail = meta && meta.ownerEmail != null && String(meta.ownerEmail).trim() !== ''

  return (
    <Modal isOpen={isOpen} onClose={onClose} outerContent={outerContent} processing={processing}>
      <div className="px-4 py-6 text-sm sm:px-6">
        {currentFeed ? (
          <>
            <p className="mb-4 text-lg font-semibold">{viewMode ? t('HeaderRSSDetails') : t('HeaderRSSFeedIsOpen')}</p>
            <TextInput value={fullFeedUrl} readOnly showCopy className="text-sm" />
            {meta && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center">
                  <span className="w-48 shrink-0 text-xs text-foreground-subdued uppercase">
                    {t('LabelPreventIndexingShort')}
                  </span>
                  <span className="text-foreground">{meta.preventIndexing ? 'Yes' : 'No'}</span>
                </div>
                {hasOwnerName && (
                  <div className="flex items-center">
                    <span className="w-48 shrink-0 text-xs text-foreground-subdued uppercase">
                      {t('LabelRSSFeedCustomOwnerName')}
                    </span>
                    <span className="text-foreground">{meta.ownerName}</span>
                  </div>
                )}
                {hasOwnerEmail && (
                  <div className="flex items-center">
                    <span className="w-48 shrink-0 text-xs text-foreground-subdued uppercase">
                      {t('LabelRSSFeedCustomOwnerEmail')}
                    </span>
                    <span className="text-foreground">{meta.ownerEmail}</span>
                  </div>
                )}
              </div>
            )}
            {viewMode && (
              <>
                {currentFeed.episodes && currentFeed.episodes.length > 0 ? (
                  <div className="mt-6 max-h-[300px] overflow-y-auto rounded-md border border-border">
                    <table className="w-full border-collapse text-sm">
                      <thead className="sticky top-0 bg-table-header-bg">
                        <tr className="border-b border-border">
                          <th className="px-2 py-2 text-start text-xs font-semibold text-foreground-muted">
                            {t('LabelEpisodeTitle')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentFeed.episodes.map((episode, index) => (
                          <tr
                            key={episode.id}
                            className={`border-b border-border last:border-b-0 ${index % 2 === 1 ? 'bg-table-row-bg-even' : ''}`}
                          >
                            <td className="px-2 py-2 text-sm text-foreground">{episode.title}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="mt-6 text-sm text-foreground-muted">{t('MessageNoEpisodes')}</div>
                )}
              </>
            )}
            {userIsAdminOrUp && !viewMode && (
              <div className="flex justify-end pt-4">
                <Btn color="bg-error" size="small" onClick={handleCloseFeed} disabled={processing}>
                  {t('ButtonCloseFeed')}
                </Btn>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="mb-4 text-lg font-semibold">{t('HeaderOpenRSSFeed')}</p>
            <div className="mb-2 space-y-2">
              <label className="block text-xs text-foreground-subdued uppercase">{t('LabelRSSFeedSlug')}</label>
              <TextInput value={newFeedSlug} onChange={(value) => setNewFeedSlug(value)} className="text-sm" />
              <p className="text-xs text-foreground-muted">{t('MessageFeedURLWillBe', { 0: demoFeedUrl })}</p>
            </div>
            <div className="space-y-3 py-2">
              <Checkbox
                value={metadataDetails.preventIndexing}
                onChange={(checked) => setMetadataDetails((prev) => ({ ...prev, preventIndexing: checked }))}
                label={t('LabelPreventIndexing')}
              />
              <div>
                <label className="mb-1 block text-xs text-foreground-subdued uppercase">
                  {t('LabelRSSFeedCustomOwnerName')}
                </label>
                <TextInput
                  value={metadataDetails.ownerName}
                  onChange={(value) => setMetadataDetails((prev) => ({ ...prev, ownerName: value }))}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-foreground-subdued uppercase">
                  {t('LabelRSSFeedCustomOwnerEmail')}
                </label>
                <TextInput
                  value={metadataDetails.ownerEmail}
                  onChange={(value) => setMetadataDetails((prev) => ({ ...prev, ownerEmail: value }))}
                  className="text-sm"
                />
              </div>
            </div>
            {isHttp && <p className="pt-2 text-xs text-warning">{t('NoteRSSFeedPodcastAppsHttps')}</p>}
            {hasEpisodesWithoutPubDate && (
              <p className="pt-2 text-xs text-warning">{t('NoteRSSFeedPodcastAppsPubDate')}</p>
            )}
            {userIsAdminOrUp && (
              <div className="flex justify-end pt-6">
                <Btn color="bg-success" size="small" onClick={handleOpenFeed} disabled={processing}>
                  {t('ButtonOpenFeed')}
                </Btn>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
