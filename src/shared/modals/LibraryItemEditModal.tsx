'use client'

import {
  type TransitionStartFunction,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'
import { useLibrary } from '@/features/library/contexts/LibraryContext'
import { deleteLibraryItemAction, updateLibraryItemMediaAction } from '@/features/player/actions/mediaActions'
import { useGlobalToast } from '@/shared/contexts/ToastContext'
import { useUser } from '@/shared/contexts/UserContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import LibraryItemModal, {
  type LibraryItemModalItemSource,
  useLibraryItemModal,
} from '@/shared/modals/LibraryItemModal'
import Btn from '@/shared/ui/Btn'
import LoadingIndicator from '@/shared/ui/LoadingIndicator'
import BookDetailsEdit, { BookDetailsEditRef, BookUpdatePayload } from '@/shared/widgets/BookDetailsEdit'
import ConfirmDialog from '@/shared/widgets/ConfirmDialog'
import PodcastDetailsEdit, { PodcastDetailsEditRef, PodcastUpdatePayload } from '@/shared/widgets/PodcastDetailsEdit'
import type { BookMedia, BookMetadata, PodcastMedia, PodcastMetadata } from '@/types/api'
import { BookLibraryItem, PodcastLibraryItem } from '@/types/api'

function createPlaceholderBookLibraryItem(id: string, libraryId: string): BookLibraryItem {
  const metadata: BookMetadata = {
    authors: [],
    narrators: [],
    series: [],
    genres: [],
    explicit: false,
    abridged: false,
  }
  const media: BookMedia = { mediaType: 'book', metadata, tags: [] }
  return {
    id,
    ino: '',
    libraryId,
    path: '',
    relPath: '',
    isFile: false,
    mtimeMs: 0,
    ctimeMs: 0,
    birthtimeMs: 0,
    addedAt: 0,
    updatedAt: 0,
    isMissing: false,
    isInvalid: false,
    mediaType: 'book',
    media,
  }
}

function createPlaceholderPodcastLibraryItem(id: string, libraryId: string): PodcastLibraryItem {
  const metadata: PodcastMetadata = {
    genres: [],
    explicit: false,
    type: 'episodic',
  }
  const media: PodcastMedia = { mediaType: 'podcast', metadata, tags: [] }
  return {
    id,
    ino: '',
    libraryId,
    path: '',
    relPath: '',
    isFile: false,
    mtimeMs: 0,
    ctimeMs: 0,
    birthtimeMs: 0,
    addedAt: 0,
    updatedAt: 0,
    isMissing: false,
    isInvalid: false,
    mediaType: 'podcast',
    media,
  }
}

export type LibraryItemEditModalProps = {
  isOpen: boolean
  onClose: () => void
  onSaved?: (libraryItem: BookLibraryItem | PodcastLibraryItem) => void
  /** Fires after a successful backend delete (before close) so hosts can refresh/navigate. */
  onDeleted?: (libraryItemId: string) => void
} & LibraryItemModalItemSource

type LibraryItemEditModalContentProps = {
  isOpen: boolean
  startSaveTransition: TransitionStartFunction
  isSavePending: boolean
  onClose: () => void
  onSaved?: (libraryItem: BookLibraryItem | PodcastLibraryItem) => void
  onDeleted?: (libraryItemId: string) => void
  /** When true (navCtx), body height stays fixed so prev/next does not resize the panel. */
  stableBodyHeight: boolean
}

function LibraryItemEditModalContent({
  isOpen,
  startSaveTransition,
  isSavePending,
  onClose,
  onSaved,
  onDeleted,
  stableBodyHeight,
}: LibraryItemEditModalContentProps) {
  const { resolvedItem, fetchPending, pendingEntityId, syncResolvedItem } = useLibraryItemModal()
  const t = useTypeSafeTranslations()
  const { showToast } = useGlobalToast()
  const { filterData, library } = useLibrary()
  const { userCanDelete } = useUser()
  const [hasChanges, setHasChanges] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const saveAndCloseRef = useRef(false)

  const bookDetailsRef = useRef<BookDetailsEditRef>(null)
  const podcastDetailsRef = useRef<PodcastDetailsEditRef>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [footerShadow, setFooterShadow] = useState(false)

  const resolvedItemId = resolvedItem?.id

  useEffect(() => {
    if (!isOpen) {
      setHasChanges(false)
      saveAndCloseRef.current = false
    }
  }, [isOpen])

  useEffect(() => {
    if (!resolvedItemId) return
    setHasChanges(false)
    saveAndCloseRef.current = false
  }, [resolvedItemId])

  useEffect(() => {
    setHasChanges(false)
    saveAndCloseRef.current = false
  }, [pendingEntityId])

  const updateFooterShadow = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const isScrollable = container.scrollHeight > container.clientHeight
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 1
    setFooterShadow(isScrollable && !isAtBottom)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const container = scrollContainerRef.current
    if (!container) return

    updateFooterShadow()
    container.addEventListener('scroll', updateFooterShadow)
    const resizeObserver = new ResizeObserver(updateFooterShadow)
    resizeObserver.observe(container)

    return () => {
      container.removeEventListener('scroll', updateFooterShadow)
      resizeObserver.disconnect()
    }
  }, [isOpen, updateFooterShadow])

  useLayoutEffect(() => {
    if (!isOpen) return
    updateFooterShadow()
  }, [isOpen, resolvedItemId, pendingEntityId, fetchPending, library.mediaType, updateFooterShadow])

  const availableAuthors = (filterData?.authors || []).map((a) => ({ value: a.id, content: a.name }))
  const availableNarrators = (filterData?.narrators || []).map((n) => ({ value: n, content: n }))
  const availableGenres = (filterData?.genres || []).map((g) => ({ value: g, content: g }))
  const availableTags = (filterData?.tags || []).map((tag) => ({ value: tag, content: tag }))
  const availableSeries = (filterData?.series || []).map((s) => ({ value: s.id, content: s.name }))

  const handleChange = (_details: { libraryItemId: string; hasChanges: boolean }) => {
    setHasChanges(_details.hasChanges)
  }

  const handleSubmit = useCallback(
    (details: { updatePayload: BookUpdatePayload | PodcastUpdatePayload; hasChanges: boolean }) => {
      const itemId = resolvedItem?.id
      if (!itemId) return

      if (!details.hasChanges) {
        if (saveAndCloseRef.current) {
          onClose()
        }
        return
      }

      startSaveTransition(async () => {
        try {
          const updatedItem = await updateLibraryItemMediaAction(itemId, {
            metadata: details.updatePayload.metadata,
            tags: details.updatePayload.tags,
          })
          if (!updatedItem) {
            showToast(t('ToastItemUpdateSuccess'), { type: 'success' })
            if (saveAndCloseRef.current) {
              onClose()
            }
            return
          }
          const next = (
            'libraryItem' in updatedItem
              ? (updatedItem as { libraryItem: BookLibraryItem | PodcastLibraryItem }).libraryItem
              : updatedItem
          ) as BookLibraryItem | PodcastLibraryItem
          showToast(t('ToastItemUpdateSuccess'), { type: 'success' })
          syncResolvedItem(next)
          onSaved?.(next)
          if (saveAndCloseRef.current) {
            onClose()
          }
        } catch (error) {
          console.error('Failed to update library item:', error)
          showToast(t('ToastFailedToUpdate'), { type: 'error' })
        }
      })
    },
    [onClose, onSaved, resolvedItem?.id, showToast, startSaveTransition, syncResolvedItem, t]
  )

  const handleSave = (close: boolean = false) => {
    saveAndCloseRef.current = close
    if (!resolvedItem) return
    if (resolvedItem.mediaType === 'podcast') {
      podcastDetailsRef.current?.submit()
    } else {
      bookDetailsRef.current?.submit()
    }
  }

  const handleRequestDelete = useCallback(() => {
    if (!userCanDelete || !resolvedItem?.id) return
    setShowDeleteConfirm(true)
  }, [resolvedItem?.id, userCanDelete])

  const handleConfirmDelete = useCallback(
    (hardDeleteChecked?: boolean) => {
      setShowDeleteConfirm(false)
      const itemId = resolvedItem?.id
      if (!itemId) return

      startSaveTransition(async () => {
        try {
          const result = await deleteLibraryItemAction(itemId, !!hardDeleteChecked)
          if (result.storageCleanup === 'pending') {
            showToast(t('ToastItemDeletedFilesPending'), { type: 'warning' })
          } else {
            showToast(t('ToastItemDeletedSuccess'), { type: 'success' })
          }
          onDeleted?.(itemId)
          onClose()
        } catch (error) {
          console.error('Failed to delete library item:', error)
          showToast(t('ToastItemDeletedFailed'), { type: 'error' })
        }
      })
    },
    [onClose, onDeleted, resolvedItem?.id, showToast, startSaveTransition, t]
  )

  const isPodcast = resolvedItem?.mediaType === 'podcast'
  const saveDisabled = !hasChanges || isSavePending || !resolvedItem || fetchPending
  const showDelete = userCanDelete && !!resolvedItem?.id

  const libraryId = library.id
  const showPlaceholderShell = fetchPending && !resolvedItem && pendingEntityId !== null
  const placeholderItem = useMemo(() => {
    if (!showPlaceholderShell || pendingEntityId === null) return null
    return library.mediaType === 'podcast'
      ? createPlaceholderPodcastLibraryItem(pendingEntityId, libraryId)
      : createPlaceholderBookLibraryItem(pendingEntityId, libraryId)
  }, [library.mediaType, libraryId, pendingEntityId, showPlaceholderShell])

  const fetchLoadingOverlay = (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg/50">
      <LoadingIndicator variant="inline" />
    </div>
  )

  const formInner =
    resolvedItem && isPodcast ? (
      <PodcastDetailsEdit
        key={resolvedItem.id}
        ref={podcastDetailsRef}
        libraryItem={resolvedItem}
        availableGenres={availableGenres}
        availableTags={availableTags}
        onChange={handleChange}
        onSubmit={handleSubmit}
      />
    ) : resolvedItem ? (
      <BookDetailsEdit
        key={resolvedItem.id}
        ref={bookDetailsRef}
        libraryItem={resolvedItem}
        availableAuthors={availableAuthors}
        availableNarrators={availableNarrators}
        availableGenres={availableGenres}
        availableTags={availableTags}
        availableSeries={availableSeries}
        onChange={handleChange}
        onSubmit={handleSubmit}
      />
    ) : showPlaceholderShell && placeholderItem ? (
      library.mediaType === 'podcast' ? (
        <div className="relative">
          <PodcastDetailsEdit
            key={`placeholder-podcast-${pendingEntityId}`}
            ref={podcastDetailsRef}
            libraryItem={placeholderItem as PodcastLibraryItem}
            availableGenres={availableGenres}
            availableTags={availableTags}
            onChange={handleChange}
            onSubmit={handleSubmit}
          />
          {fetchLoadingOverlay}
        </div>
      ) : (
        <div className="relative">
          <BookDetailsEdit
            key={`placeholder-book-${pendingEntityId}`}
            ref={bookDetailsRef}
            libraryItem={placeholderItem as BookLibraryItem}
            availableAuthors={availableAuthors}
            availableNarrators={availableNarrators}
            availableGenres={availableGenres}
            availableTags={availableTags}
            availableSeries={availableSeries}
            onChange={handleChange}
            onSubmit={handleSubmit}
          />
          {fetchLoadingOverlay}
        </div>
      )
    ) : fetchPending && !resolvedItem ? (
      <div className="flex min-h-[24rem] items-center justify-center">
        <LoadingIndicator variant="inline" />
      </div>
    ) : null

  return (
    <>
      <div
        className={
          stableBodyHeight
            ? /* Slightly above empty book placeholder; extra content scrolls in the inner region. */
              'flex h-[min(50rem,85vh)] max-h-[85vh] w-full flex-col rounded-lg'
            : 'flex max-h-[85vh] w-full flex-col rounded-lg'
        }
      >
        <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          {formInner}
        </div>

        <div
          className={`flex shrink-0 items-center justify-between gap-3 border-t border-border bg-bg px-4 py-3 transition-shadow duration-200 ${footerShadow ? 'box-shadow-md-up' : ''}`}
        >
          <div>
            {showDelete && (
              <Btn
                color="bg-error"
                onClick={handleRequestDelete}
                disabled={isSavePending || fetchPending}
                ariaLabel={t('ButtonDelete')}
              >
                {t('ButtonDelete')}
              </Btn>
            )}
          </div>
          <div className="flex gap-3">
            <Btn onClick={() => handleSave(false)} disabled={saveDisabled}>
              {t('ButtonSave')}
            </Btn>
            <Btn onClick={() => handleSave(true)} disabled={saveDisabled}>
              {t('ButtonSaveAndClose')}
            </Btn>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        message={t('MessageConfirmDeleteLibraryItem')}
        checkboxLabel={t('LabelDeleteFromFileSystemCheckbox')}
        yesButtonText={t('ButtonDelete')}
        yesButtonClassName="bg-error"
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}

/**
 * Modal for editing library item metadata.
 * Renders BookDetailsEdit for books and PodcastDetailsEdit for podcasts.
 * Uses filter data from LibraryContext for autocomplete options.
 * Pass `navCtx` to load expanded items and enable prev/next like MatchModal.
 */
export default function LibraryItemEditModal(props: LibraryItemEditModalProps) {
  const { isOpen, onClose, onSaved, onDeleted } = props
  const navCtxMode = 'navCtx' in props
  const { filterDataLoading } = useLibrary()
  const [isSavePending, startSaveTransition] = useTransition()

  return (
    <LibraryItemModal
      isOpen={isOpen}
      onClose={onClose}
      {...(navCtxMode ? { navCtx: props.navCtx } : { libraryItem: props.libraryItem })}
      additionalProcessing={isSavePending || filterDataLoading}
      className="sm:max-w-screen md:max-w-[800px]"
    >
      <LibraryItemEditModalContent
        isOpen={isOpen}
        startSaveTransition={startSaveTransition}
        isSavePending={isSavePending}
        onClose={onClose}
        onSaved={onSaved}
        onDeleted={onDeleted}
        stableBodyHeight={navCtxMode}
      />
    </LibraryItemModal>
  )
}
