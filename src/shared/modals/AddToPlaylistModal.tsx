'use client'

import { HelpCircle, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchPlaylistsAction } from '@/features/library/actions/libraryActions'
import {
  batchAddToPlaylistAction,
  batchRemoveFromPlaylistAction,
  createPlaylistAction,
} from '@/features/library/actions/playlistActions'
import { useGlobalToast } from '@/shared/contexts/ToastContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { ApiError } from '@/shared/lib/apiErrors'
import Modal from '@/shared/modals/Modal'
import Btn from '@/shared/ui/Btn'
import IconBtn from '@/shared/ui/IconBtn'
import TextInput from '@/shared/ui/TextInput'
import Tooltip from '@/shared/ui/Tooltip'
import PlaylistGroupCover from '@/shared/widgets/media-card/PlaylistGroupCover'
import type { Playlist } from '@/types/api'

type PlaylistRow = Playlist & { isItemIncluded: boolean }

interface AddToPlaylistModalProps {
  isOpen: boolean
  onClose: () => void
  libraryId: string
  libraryItemId: string
  /** Podcast episode when adding an episode */
  episodeId?: string | null
  itemTitle: string
}

function playlistHasItem(playlist: Playlist, libraryItemId: string, episodeId: string | null) {
  const items = playlist.items ?? []
  if (episodeId) {
    return items.some((i) => i.libraryItemId === libraryItemId && i.episodeId === episodeId)
  }
  return items.some((i) => i.libraryItemId === libraryItemId && !i.episodeId)
}

export default function AddToPlaylistModal({
  isOpen,
  onClose,
  libraryId,
  libraryItemId,
  episodeId = null,
  itemTitle,
}: AddToPlaylistModalProps) {
  const t = useTypeSafeTranslations()
  const { showToast } = useGlobalToast()
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [isMutating, setIsMutating] = useState(false)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [newPlaylistName, setNewPlaylistName] = useState('')

  // Playlist covers are always square
  const coverWidth = 64
  const coverHeight = 64

  const itemPayload = useMemo(
    () => [{ libraryItemId, episodeId: episodeId ?? null }] as const,
    [libraryItemId, episodeId]
  )

  const sortedPlaylists = useMemo((): PlaylistRow[] => {
    return [...playlists]
      .map((p): PlaylistRow => ({
        ...p,
        isItemIncluded: playlistHasItem(p, libraryItemId, episodeId),
      }))
      .sort((a, b) => {
        if (a.isItemIncluded !== b.isItemIncluded) {
          return a.isItemIncluded ? -1 : 1
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      })
  }, [playlists, libraryItemId, episodeId])

  useEffect(() => {
    if (!isOpen) return
    setPlaylists([])
    setNewPlaylistName('')
    setLoadingInitial(true)
    let cancelled = false
    void (async () => {
      try {
        const res = await fetchPlaylistsAction(libraryId, '')
        if (!cancelled) setPlaylists(res.results)
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load playlists', error)
          showToast(t('ToastFailedToLoadData'), { type: 'error' })
          setPlaylists([])
        }
      } finally {
        if (!cancelled) setLoadingInitial(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isOpen, libraryId, showToast, t])

  const mergeUpdatedPlaylist = useCallback((updated: Playlist) => {
    setPlaylists((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }, [])

  const handleAdd = useCallback(
    (playlist: Playlist) => {
      setIsMutating(true)
      void (async () => {
        try {
          const updated = await batchAddToPlaylistAction(playlist.id, [...itemPayload])
          mergeUpdatedPlaylist(updated)
        } catch (error) {
          console.error('Failed to add to playlist', error)
          showToast(t('ToastFailedToUpdate'), { type: 'error' })
        } finally {
          setIsMutating(false)
        }
      })()
    },
    [itemPayload, mergeUpdatedPlaylist, showToast, t]
  )

  const handleRemove = useCallback(
    (playlist: Playlist) => {
      setIsMutating(true)
      void (async () => {
        try {
          const updated = await batchRemoveFromPlaylistAction(playlist.id, [...itemPayload])
          mergeUpdatedPlaylist(updated)
        } catch (error) {
          console.error('Failed to remove from playlist', error)
          showToast(t('ToastFailedToUpdate'), { type: 'error' })
        } finally {
          setIsMutating(false)
        }
      })()
    },
    [itemPayload, mergeUpdatedPlaylist, showToast, t]
  )

  const handleCreatePlaylist = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault()
      const name = newPlaylistName.trim()
      if (!name) return
      setIsMutating(true)
      void (async () => {
        try {
          const created = await createPlaylistAction({
            libraryId,
            name,
            items: [...itemPayload],
          })
          setPlaylists((prev) => {
            if (prev.some((p) => p.id === created.id)) {
              return prev.map((p) => (p.id === created.id ? created : p))
            }
            return [...prev, created]
          })
          setNewPlaylistName('')
        } catch (error) {
          console.error('Failed to create playlist', error)
          const message = error instanceof ApiError ? error.message : t('ToastPlaylistCreateFailed')
          showToast(message, { type: 'error' })
        } finally {
          setIsMutating(false)
        }
      })()
    },
    [libraryId, itemPayload, newPlaylistName, showToast, t]
  )

  const outerContent = (
    <div className="absolute start-0 top-0 p-4">
      <p className="max-w-[calc(100vw-4rem)] truncate text-xl font-semibold text-white" title={itemTitle}>
        {itemTitle}
      </p>
    </div>
  )

  const controlsDisabled = loadingInitial || isMutating

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      processing={loadingInitial}
      outerContent={outerContent}
      className="max-w-lg bg-white/5 backdrop-blur-md sm:max-w-lg md:max-w-lg lg:max-w-lg"
    >
      <div className="max-h-[80vh] w-full overflow-x-hidden overflow-y-auto rounded-lg">
        {isOpen && (
          <>
            <div className="px-4 pt-4 pb-2">
              <h1 className="text-lg font-semibold tracking-tight">{t('LabelAddToPlaylist')}</h1>
            </div>

            <div className="max-h-96 w-full overflow-x-hidden overflow-y-auto pt-4 pb-2">
              <div>
                {sortedPlaylists.map((playlist) => {
                  const included = playlist.isItemIncluded
                  const playlistItems = playlist.items ?? []
                  return (
                    <div
                      key={playlist.id}
                      className="relative flex items-center justify-start px-4 py-2 transition-colors hover:bg-white/10"
                    >
                      {included && <div className="absolute start-0 top-0 z-10 h-full w-1 bg-success" aria-hidden />}
                      <div className="w-20 max-w-20 shrink-0 text-center">
                        <PlaylistGroupCover items={playlistItems} width={coverWidth} height={coverHeight} />
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden px-2">
                        <Link
                          href={`/library/${libraryId}/playlist/${playlist.id}`}
                          className="cursor-pointer truncate ps-2 pe-2 hover:underline"
                          onClick={() => onClose()}
                        >
                          {playlist.name}
                        </Link>
                      </div>
                      <div className="flex h-full shrink-0 items-center justify-end ps-2">
                        {included ? (
                          <IconBtn
                            ariaLabel={t('ButtonRemove')}
                            size="auto"
                            outlined={false}
                            className="h-9 min-w-10 bg-error/80 px-3 text-white hover:bg-error"
                            disabled={controlsDisabled}
                            onClick={() => handleRemove(playlist)}
                          >
                            <Trash2 size={18} />
                          </IconBtn>
                        ) : (
                          <IconBtn
                            ariaLabel={t('ButtonAdd')}
                            size="auto"
                            outlined={false}
                            className="h-9 min-w-10 bg-success/80 px-3 text-white hover:bg-success"
                            disabled={controlsDisabled}
                            onClick={() => handleAdd(playlist)}
                            icon={Plus}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {!loadingInitial && playlists.length === 0 && (
              <div className="flex h-32 items-center justify-center px-4 text-center sm:px-6">
                <div>
                  <p className="mb-2 text-xl">{t('MessageNoUserPlaylists')}</p>
                  <div className="flex items-center justify-center text-sm text-foreground-muted">
                    <p>{t('MessageNoUserPlaylistsHelp')}</p>
                    <Tooltip text={t('LabelClickForMoreInfo')} className="ms-2 inline-flex">
                      <a
                        href="https://www.audiobookphile.org/guides/collections"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex text-white/40 transition-colors hover:text-primary"
                      >
                        <HelpCircle size={18} strokeWidth={2.5} />
                      </a>
                    </Tooltip>
                  </div>
                </div>
              </div>
            )}

            <div className="h-px w-full border-t border-border" />

            <form onSubmit={handleCreatePlaylist}>
              <div className="flex items-center px-4 py-2 text-center sm:px-6">
                <div className="grow px-2">
                  <TextInput
                    value={newPlaylistName}
                    placeholder={t('PlaceholderNewPlaylist')}
                    onChange={setNewPlaylistName}
                    disabled={controlsDisabled}
                    className="w-full"
                  />
                </div>
                <Btn
                  type="submit"
                  color="bg-success"
                  size="small"
                  className="h-10 shrink-0"
                  disabled={controlsDisabled || !newPlaylistName.trim()}
                >
                  {t('ButtonCreate')}
                </Btn>
              </div>
            </form>
          </>
        )}
      </div>
    </Modal>
  )
}
