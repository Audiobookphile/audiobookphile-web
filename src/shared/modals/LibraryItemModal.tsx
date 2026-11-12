'use client'

import { motion } from 'framer-motion'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'
import { getExpandedLibraryItemAction } from '@/features/player/actions/mediaActions'
import { useGlobalToast } from '@/shared/contexts/ToastContext'
import { useEntityNavigationContext } from '@/shared/hooks/useEntityNavigationContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import type { EntityNavigationContext } from '@/shared/lib/bookshelfNavigationContext'
import type { ModalProps } from '@/shared/modals/Modal'
import Modal from '@/shared/modals/Modal'
import ModalSideNavigation from '@/shared/modals/ModalSideNavigation'
import type { BookLibraryItem, PodcastLibraryItem } from '@/types/api'

export type LibraryItemModalContextValue = {
  resolvedItem: BookLibraryItem | PodcastLibraryItem | null
  /** True while the expanded library item is loading in `navCtx` mode; always false when using `libraryItem`. */
  fetchPending: boolean
  /**
   * In `navCtx` mode, the entity id currently being fetched while `resolvedItem` is still null.
   * Use to build placeholder edit shells; null when not applicable.
   */
  pendingEntityId: string | null
  /** Updates the fetched item in nav mode (e.g. after save). No-op in `directLibraryItem` mode. */
  syncResolvedItem: (item: BookLibraryItem | PodcastLibraryItem) => void
}

const LibraryItemModalContext = createContext<LibraryItemModalContextValue | null>(null)

export function useLibraryItemModal(): LibraryItemModalContextValue {
  const ctx = useContext(LibraryItemModalContext)
  if (!ctx) {
    throw new Error('useLibraryItemModal must be used within LibraryItemModal')
  }
  return ctx
}

/** Either `navCtx` (fetch + prev/next) or `libraryItem` (no fetch); object literals cannot include both. */
export type LibraryItemModalItemSource =
  { navCtx: EntityNavigationContext } | { libraryItem: BookLibraryItem | PodcastLibraryItem }

export type LibraryItemModalProps = Omit<ModalProps, 'outerContent' | 'sideNavigation' | 'processing' | 'children'> &
  LibraryItemModalItemSource & {
    additionalProcessing?: boolean
    children: ReactNode
  }

/**
 * `Modal` shell for library-item flows: `navCtx` (fetch + prev/next) or `directLibraryItem` (no fetch),
 * title chrome, side rails, and optional `additionalProcessing` overlay on `Modal`.
 * Descendants read `resolvedItem` / `fetchPending` / `pendingEntityId` / `syncResolvedItem` via {@link useLibraryItemModal}.
 */
export default function LibraryItemModal(props: LibraryItemModalProps) {
  const {
    additionalProcessing = false,
    children,
    isOpen,
    onClose,
    persistent,
    zIndexClass,
    bgOpacityClass,
    className,
    style,
  } = props

  const navCtxMode = 'navCtx' in props
  const navCtx = navCtxMode ? props.navCtx : undefined
  const libraryItem = 'libraryItem' in props ? props.libraryItem : undefined

  const entityIds = navCtx?.entityIds ?? []

  const t = useTypeSafeTranslations()
  const { showToast } = useGlobalToast()
  const [fetchedItem, setFetchedItem] = useState<BookLibraryItem | PodcastLibraryItem | null>(null)
  const [isNavPending, startNavTransition] = useTransition()
  const [navFetchPending, setNavFetchPending] = useState(false)
  const fetchGenRef = useRef(0)

  const { currentEntityId, canGoPrev, canGoNext, goPrev, goNext } = useEntityNavigationContext(navCtx, isOpen)

  useLayoutEffect(() => {
    if (!isOpen || !navCtxMode) return
    if (!currentEntityId) {
      setFetchedItem(null)
      return
    }

    const gen = ++fetchGenRef.current
    setNavFetchPending(true)
    setFetchedItem(null)

    startNavTransition(async () => {
      try {
        const full = await getExpandedLibraryItemAction(currentEntityId)
        if (fetchGenRef.current !== gen) return
        setFetchedItem(full as BookLibraryItem | PodcastLibraryItem)
      } catch (error) {
        console.error('Failed to load expanded library item', error)
        if (fetchGenRef.current === gen) {
          showToast(t('ToastFailedToLoadData'), { type: 'error' })
          onClose?.()
        }
      } finally {
        if (fetchGenRef.current === gen) {
          setNavFetchPending(false)
        }
      }
    })
  }, [isOpen, navCtxMode, navCtx, currentEntityId, onClose, showToast, startNavTransition, t])

  const resolvedItem = navCtxMode ? fetchedItem : (libraryItem ?? null)

  const syncResolvedItem = useCallback(
    (item: BookLibraryItem | PodcastLibraryItem) => {
      if (navCtxMode) setFetchedItem(item)
    },
    [navCtxMode]
  )

  const blurActiveElement = useCallback(() => {
    const el = document.activeElement
    if (el instanceof HTMLElement) el.blur()
  }, [])

  const handleGoPrev = useCallback(() => {
    blurActiveElement()
    goPrev()
  }, [blurActiveElement, goPrev])

  const handleGoNext = useCallback(() => {
    blurActiveElement()
    goNext()
  }, [blurActiveElement, goNext])

  const mediaTitle = resolvedItem?.media.metadata.title ?? ''
  const outerContent = useMemo(() => {
    if (!mediaTitle) return undefined
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="pointer-events-none absolute inset-x-0 top-0 z-10 px-6 py-4"
      >
        <div className="max-w-prose">
          <h2 className="truncate text-xl font-semibold tracking-tight text-white/90 drop-shadow-md" title={mediaTitle}>
            {mediaTitle}
          </h2>
          {resolvedItem && 'authors' in resolvedItem.media.metadata && (
            <p className="truncate text-sm font-medium text-white/60">
              {(resolvedItem.media.metadata.authors as Array<{ name?: string }>)
                ?.map((a) => a.name)
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
        </div>
      </motion.div>
    )
  }, [mediaTitle, resolvedItem])

  const showRails = navCtxMode && entityIds.length > 1
  const fetchPending = navCtxMode && (navFetchPending || isNavPending)
  const pendingEntityId = navCtxMode && fetchPending && !resolvedItem ? (currentEntityId ?? null) : null
  const modalProcessing = additionalProcessing

  const sideNavigation = useMemo(() => {
    if (!showRails || !isOpen) return undefined
    return (
      <ModalSideNavigation
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onPrevAction={handleGoPrev}
        onNextAction={handleGoNext}
      />
    )
  }, [showRails, isOpen, canGoPrev, canGoNext, handleGoPrev, handleGoNext])

  const modalItemCtx = useMemo(
    () => ({
      resolvedItem,
      fetchPending,
      pendingEntityId,
      syncResolvedItem,
    }),
    [resolvedItem, fetchPending, pendingEntityId, syncResolvedItem]
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      persistent={persistent}
      zIndexClass={zIndexClass}
      bgOpacityClass={bgOpacityClass}
      className={className}
      style={style}
      outerContent={outerContent}
      sideNavigation={sideNavigation}
      processing={modalProcessing}
    >
      <LibraryItemModalContext.Provider value={modalItemCtx}>{children}</LibraryItemModalContext.Provider>
    </Modal>
  )
}
