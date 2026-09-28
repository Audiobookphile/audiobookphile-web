'use client'

import { AlertCircle, BookOpen, CheckSquare, Edit, ListPlus, Pause, Play } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useMediaContext } from '@/features/player/contexts/MediaContext'
import { useUser } from '@/shared/contexts/UserContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { isLibraryItemPlayable } from '@/shared/lib/mediaPlayability'
import { mergeClasses } from '@/shared/lib/merge-classes'
import AddToCollectionModal from '@/shared/modals/AddToCollectionModal'
import AddToPlaylistModal from '@/shared/modals/AddToPlaylistModal'
import MatchModal from '@/shared/modals/MatchModal'
import RssFeedOpenCloseModal from '@/shared/modals/RssFeedOpenCloseModal'
import ShareModal from '@/shared/modals/ShareModal'
import Btn from '@/shared/ui/Btn'
import ContextMenuDropdown, { type ContextMenuDropdownItem } from '@/shared/ui/ContextMenuDropdown'
import IconBtn from '@/shared/ui/IconBtn'
import ReadIconBtn from '@/shared/ui/ReadIconBtn'
import Tooltip from '@/shared/ui/Tooltip'
import ConfirmDialog from '@/shared/widgets/ConfirmDialog'
import { useMediaCardActions } from '@/shared/widgets/media-card/useMediaCardActions'
import { type BookLibraryItem, PlayerState, type PodcastLibraryItem, type RssFeed } from '@/types/api'

interface LibraryItemActionButtonsProps {
  libraryItem: BookLibraryItem | PodcastLibraryItem
  onEdit: () => void
  /** Current RSS feed state (from useItemPageSocket + initial server data). */
  rssFeed?: RssFeed | null
}

export default function LibraryItemActionButtons({
  libraryItem,
  onEdit,
  rssFeed = null,
}: LibraryItemActionButtonsProps) {
  const { userCanUpdate, getMediaItemProgress, ereaderDevices } = useUser()
  const {
    playItem,
    libraryItemIdStreaming,
    streamLibraryItem,
    isStreaming: isStreamingFn,
    isPlaying: isPlayingFn,
    isStreamingFromDifferentLibrary,
    getIsMediaQueued,
    addItemToQueue,
    removeItemFromQueue,
    playerHandler,
  } = useMediaContext()
  const t = useTypeSafeTranslations()
  const [matchModalOpen, setMatchModalOpen] = useState(false)
  const handleOpenMatch = useCallback(() => {
    setMatchModalOpen(true)
  }, [])

  const mediaProgress = libraryItem.media?.id ? getMediaItemProgress(libraryItem.media.id) : undefined
  const isRead = mediaProgress?.isFinished ?? false

  const isPodcast = libraryItem.mediaType === 'podcast'
  const isBook = libraryItem.mediaType === 'book'
  const bookMedia = !isPodcast ? libraryItem.media : null
  const podcastMedia = isPodcast ? libraryItem.media : null
  const podcastEpisodes = isPodcast ? (podcastMedia?.episodes ?? []) : []
  const ebookFile = isBook ? bookMedia?.ebookFile : undefined

  // Was `bookMedia?.tracks` — a field the API never emits, so this was always
  // [] and the Play button was hidden for every book on the detail page.
  // isLibraryItemPlayable() reads audioFiles / numTracks / duration instead.
  const showPlayButton = isLibraryItemPlayable(libraryItem)
  const isStreaming = isStreamingFn(libraryItem.id, null)
  const isItemPlaying = isPlayingFn(libraryItem.id, null)
  const showQueueBtn = isBook && !!streamLibraryItem && !isStreamingFromDifferentLibrary(libraryItem.libraryId)
  const isQueued = getIsMediaQueued(libraryItem.id, null)
  const showReadButton = isBook && !!ebookFile
  const isStreamingFromDifferentLib = isStreamingFromDifferentLibrary(libraryItem.libraryId)

  const {
    processing,
    confirmState,
    rssFeedModalOpen,
    shareModalOpen,
    collectionsModalOpen,
    playlistsModalOpen,
    mediaItemShare,
    closeConfirm,
    closeRssFeedModal,
    closeShareModal,
    closeCollectionsModal,
    closePlaylistsModal,
    handleShareChange,
    handleReadEBook,
    handleMoreAction,
    moreMenuItems,
  } = useMediaCardActions({
    libraryItem,
    media: libraryItem.media,
    title: libraryItem.media?.metadata?.title ?? '',
    author:
      libraryItem.media?.metadata && 'authors' in libraryItem.media.metadata
        ? (libraryItem.media.metadata.authors ?? []).map((a) => a.name).join(', ')
        : null,
    episodeForQueue: null,
    mediaProgress,
    itemIsFinished: isRead,
    userProgressPercent: mediaProgress?.progress ?? 0,
    isPodcast,
    ereaderDevices,
    continueListeningShelf: false,
    libraryItemIdStreaming,
    isStreaming: isStreamingFn,
    isStreamingFromDifferentLib,
    isQueued,
    initialShare: libraryItem.mediaItemShare ?? null,
    onDeleteSuccess: () => {
      window.location.href = `/library/${libraryItem.libraryId}`
    },
    onOpenMatch: handleOpenMatch,
    playerControls: playerHandler.controls,
  })

  const handlePlay = useCallback(() => {
    if (isStreaming) {
      playerHandler.controls.playPause()
      return
    }
    void playItem({
      libraryItem,
      episodeId: null,
      queueItems: [],
    })
  }, [isStreaming, libraryItem, playItem, playerHandler.controls])

  const handleQueueClick = useCallback(() => {
    if (isQueued) {
      removeItemFromQueue({ libraryItemId: libraryItem.id, episodeId: null })
      return
    }

    const title = libraryItem.media?.metadata?.title ?? ''
    const subtitle =
      libraryItem.media?.metadata && 'authors' in libraryItem.media.metadata
        ? (libraryItem.media.metadata.authors ?? []).map((a) => a.name).join(', ')
        : ''
    addItemToQueue({
      libraryItemId: libraryItem.id,
      libraryId: libraryItem.libraryId,
      episodeId: null,
      title,
      subtitle,
      caption: '',
      duration: isBook ? (libraryItem.media?.duration ?? null) : null,
      coverPath: libraryItem.media?.coverPath ?? null,
    })
  }, [addItemToQueue, isBook, isQueued, libraryItem, removeItemFromQueue])

  const handleToggleFinished = useCallback(() => {
    handleMoreAction('toggleFinished')
  }, [handleMoreAction])

  const contextMenuItems = useMemo<ContextMenuDropdownItem<string>[]>(() => {
    return moreMenuItems
      .filter((item) => item.func !== 'toggleFinished')
      .map((item) => ({
        text: item.text,
        action: item.func ?? '',
        subitems: item.subitems?.map((subitem) => ({
          text: subitem.text,
          action: subitem.func,
          data: subitem.data,
        })),
      }))
  }, [moreMenuItems])

  const handleContextMenuAction = useCallback(
    ({ action, data }: { action: string; data?: Record<string, string> }) => {
      handleMoreAction(action, data)
    },
    [handleMoreAction]
  )

  const hasContextMenu = contextMenuItems.length > 0

  return (
    <>
      <div className="flex flex-wrap items-center justify-start gap-3 pt-6">
        {showPlayButton && (
          <Btn
            onClick={handlePlay}
            loading={playerHandler.state.playerState === PlayerState.LOADING}
            color={isItemPlaying ? 'bg-primary' : 'bg-success'}
            size="small"
            className="shadow-success/20 flex h-10 items-center rounded-xl px-6 text-[11px] font-black tracking-widest uppercase shadow-lg"
          >
            {isItemPlaying ? (
              <Pause size={18} className="mr-2 fill-current" />
            ) : (
              <Play size={18} className="mr-2 fill-current" />
            )}
            {isItemPlaying ? t('ButtonPause') : t('ButtonPlay')}
          </Btn>
        )}

        {!showPlayButton && (libraryItem.isMissing || libraryItem.isInvalid) && (
          <Btn
            color="bg-error"
            size="small"
            className="flex h-10 items-center rounded-xl px-6 text-[11px] font-black tracking-widest uppercase opacity-80"
            disabled
          >
            <AlertCircle size={18} className="mr-2" />
            {libraryItem.isMissing ? t('LabelMissing') : t('LabelIncomplete')}
          </Btn>
        )}

        {showReadButton && (
          <Btn
            onClick={handleReadEBook}
            color="bg-info"
            size="small"
            className="shadow-info/20 flex h-10 items-center rounded-xl px-6 text-[11px] font-black tracking-widest uppercase shadow-lg"
          >
            <BookOpen size={18} className="mr-2" />
            {t('ButtonRead')}
          </Btn>
        )}

        <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-2 py-1 backdrop-blur-md">
          {showQueueBtn && (
            <Tooltip text={isQueued ? t('ButtonQueueRemoveItem') : t('ButtonQueueAddItem')} position="top">
              <span className="inline-flex">
                <IconBtn
                  ariaLabel={isQueued ? t('ButtonQueueRemoveItem') : t('ButtonQueueAddItem')}
                  onClick={handleQueueClick}
                  borderless
                  className={mergeClasses(
                    'transition-all duration-300',
                    isQueued ? 'text-success scale-110' : 'text-foreground/60 hover:text-white'
                  )}
                  size="small"
                  icon={isQueued ? CheckSquare : ListPlus}
                />
              </span>
            </Tooltip>
          )}

          {userCanUpdate && (
            <Tooltip text={t('LabelEdit')} position="top">
              <span className="inline-flex">
                <IconBtn
                  ariaLabel={t('LabelEdit')}
                  onClick={onEdit}
                  borderless
                  className="text-foreground/60 hover:text-white"
                  size="small"
                  icon={Edit}
                />
              </span>
            </Tooltip>
          )}

          {!isPodcast && (
            <Tooltip text={isRead ? t('MessageMarkAsNotFinished') : t('MessageMarkAsFinished')} position="top">
              <span className="inline-flex">
                <ReadIconBtn
                  isRead={isRead}
                  disabled={processing}
                  onClick={handleToggleFinished}
                  borderless
                  size="small"
                />
              </span>
            </Tooltip>
          )}

          {hasContextMenu && (
            <ContextMenuDropdown
              items={contextMenuItems}
              menuWidth={180}
              onAction={handleContextMenuAction}
              size="small"
              borderless
              className="text-foreground/60 hover:text-white"
            />
          )}
        </div>
      </div>

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
      <RssFeedOpenCloseModal
        isOpen={rssFeedModalOpen}
        onClose={closeRssFeedModal}
        entity={{
          id: libraryItem.id,
          name: libraryItem.media?.metadata?.title ?? '',
          type: 'item',
          feed: rssFeed ?? null,
          hasEpisodesWithoutPubDate: isPodcast && podcastEpisodes.some((ep) => !ep.pubDate),
        }}
      />
      <ShareModal
        isOpen={shareModalOpen}
        onClose={closeShareModal}
        mediaItemId={libraryItem.media?.id ?? ''}
        mediaItemShare={mediaItemShare}
        onShareChange={handleShareChange}
      />
      {collectionsModalOpen && (
        <AddToCollectionModal
          isOpen={collectionsModalOpen}
          onClose={closeCollectionsModal}
          libraryId={libraryItem.libraryId}
          libraryItemId={libraryItem.id}
          itemTitle={libraryItem.media?.metadata?.title ?? ''}
        />
      )}
      {playlistsModalOpen && (
        <AddToPlaylistModal
          isOpen={playlistsModalOpen}
          onClose={closePlaylistsModal}
          libraryId={libraryItem.libraryId}
          libraryItemId={libraryItem.id}
          episodeId={null}
          itemTitle={libraryItem.media?.metadata?.title ?? ''}
        />
      )}
      <MatchModal isOpen={matchModalOpen} onClose={() => setMatchModalOpen(false)} libraryItem={libraryItem} />
    </>
  )
}
