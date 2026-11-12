'use client'

import { Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { useBookCoverAspectRatio } from '@/features/library/contexts/LibraryContext'
import { useUser } from '@/shared/contexts/UserContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import CollectionEditModal from '@/shared/modals/CollectionEditModal'
import RssFeedOpenCloseModal from '@/shared/modals/RssFeedOpenCloseModal'
import IconBtn from '@/shared/ui/IconBtn'
import Tooltip from '@/shared/ui/Tooltip'
import ConfirmDialog from '@/shared/widgets/ConfirmDialog'
import CollectionGroupCover from '@/shared/widgets/media-card/CollectionGroupCover'
import MediaCardMoreMenu from '@/shared/widgets/media-card/MediaCardMoreMenu'
import { useCollectionCardActions } from '@/shared/widgets/media-card/useCollectionCardActions'
import { Collection } from '@/types/api'

interface CollectionClientProps {
  collection: Collection
}

export default function CollectionClient({ collection }: CollectionClientProps) {
  const coverAspectRatio = useBookCoverAspectRatio()
  const { userCanUpdate } = useUser()
  const t = useTypeSafeTranslations()
  const router = useRouter()
  const coverWidth = 120
  const coverHeight = coverWidth / coverAspectRatio

  const rssFeed = useMemo(() => collection.rssFeed ?? null, [collection.rssFeed])
  const [rssFeedModalOpen, setRssFeedModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)

  const handleOpenRssFeedModal = useCallback(() => {
    setRssFeedModalOpen(true)
  }, [])

  const handleCollectionDeleted = useCallback(() => {
    router.push(`/library/${collection.libraryId}/collections`)
  }, [collection.libraryId, router])

  const { processing, confirmState, closeConfirm, handleMoreAction, moreMenuItems } = useCollectionCardActions({
    collection,
    rssFeed,
    onOpenRssFeedModal: handleOpenRssFeedModal,
    onCollectionDeleted: handleCollectionDeleted,
  })

  const showHeaderActions = userCanUpdate || moreMenuItems.length > 0

  return (
    <div>
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 md:flex-row md:items-start">
        <CollectionGroupCover books={collection.books ?? []} width={coverWidth * 2} height={coverHeight} />
        <div className="flex w-full min-w-0 flex-1 flex-col gap-2">
          <div className="flex min-w-0 items-center gap-4">
            <h1 className="min-w-0 flex-1 truncate text-2xl font-bold text-foreground">{collection.name}</h1>
            {showHeaderActions && (
              <div className="flex shrink-0 items-center gap-1">
                {userCanUpdate && (
                  <Tooltip text={t('LabelEdit')} position="top">
                    <span className="inline-flex">
                      <IconBtn
                        ariaLabel={t('LabelEdit')}
                        onClick={() => setEditModalOpen(true)}
                        outlined
                        className="mx-0.5"
                        size="small"
                        icon={Pencil}
                      />
                    </span>
                  </Tooltip>
                )}
                {moreMenuItems.length > 0 && (
                  <MediaCardMoreMenu
                    items={moreMenuItems}
                    processing={processing}
                    onAction={handleMoreAction}
                    className="mx-0.5 h-9 w-9 border border-border bg-primary text-button-foreground hover:not-disabled:text-button-foreground"
                  />
                )}
              </div>
            )}
          </div>
          {collection.description && <p className="text-foreground-muted">{collection.description}</p>}
        </div>
      </div>

      {userCanUpdate && (
        <CollectionEditModal
          isOpen={editModalOpen}
          collection={collection}
          onClose={() => setEditModalOpen(false)}
          onSaved={() => router.refresh()}
        />
      )}

      <RssFeedOpenCloseModal
        isOpen={rssFeedModalOpen}
        onClose={() => setRssFeedModalOpen(false)}
        entity={{
          id: collection.id,
          name: collection.name,
          type: 'collection',
          feed: rssFeed,
        }}
        onFeedChange={() => router.refresh()}
      />

      {confirmState && (
        <ConfirmDialog
          isOpen={confirmState.isOpen}
          message={confirmState.message}
          checkboxLabel={confirmState.checkboxLabel}
          yesButtonText={confirmState.yesButtonText}
          yesButtonClassName={confirmState.yesButtonClassName}
          onClose={closeConfirm}
          onConfirm={(value) => {
            confirmState.onConfirm(value)
          }}
        />
      )}
    </div>
  )
}
