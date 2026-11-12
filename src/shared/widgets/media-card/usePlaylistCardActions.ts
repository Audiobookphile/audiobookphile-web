'use client'

import { type ReactNode, useCallback, useMemo, useState, useTransition } from 'react'
import { deletePlaylistAction } from '@/features/library/actions/playlistActions'
import { useGlobalToast } from '@/shared/contexts/ToastContext'
import { useUser } from '@/shared/contexts/UserContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import type { Playlist } from '@/types/api'
import { MediaCardMoreMenuItem } from './MediaCardMoreMenu'

interface ConfirmState {
  isOpen: boolean
  message: string | ReactNode
  checkboxLabel?: string
  yesButtonText?: string
  yesButtonClassName?: string
  onConfirm: (checkboxValue?: boolean) => void
}

interface UsePlaylistCardActionsProps {
  playlist: Playlist
}

export function usePlaylistCardActions({ playlist }: UsePlaylistCardActionsProps) {
  const t = useTypeSafeTranslations()
  const { userCanUpdate, userCanDelete } = useUser()
  const { showToast } = useGlobalToast()
  const [processing, setProcessing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)

  const handleMoreAction = useCallback(
    (action: string) => {
      if (action === 'delete') {
        setConfirmState({
          isOpen: true,
          message: t('MessageConfirmRemovePlaylist', { 0: playlist.name }),
          yesButtonText: t('ButtonDelete'),
          yesButtonClassName: 'bg-error',
          onConfirm: () => {
            setConfirmState(null)
            startTransition(async () => {
              try {
                setProcessing(true)
                await deletePlaylistAction(playlist.id)
                showToast(t('ToastPlaylistRemoveSuccess'), { type: 'success' })
              } catch (error) {
                console.error('Failed to delete playlist', error)
                showToast(t('ToastRemoveFailed'), { type: 'error' })
              } finally {
                setProcessing(false)
              }
            })
          },
        })
      }
    },
    [playlist.id, playlist.name, showToast, t]
  )

  const moreMenuItems = useMemo<MediaCardMoreMenuItem[]>(() => {
    const items: MediaCardMoreMenuItem[] = []

    // Delete playlist - requires delete permission or update permission (since playlists are user-owned)
    if (userCanDelete || userCanUpdate) {
      items.push({
        text: t('ButtonDelete'),
        func: 'delete',
      })
    }

    return items
  }, [t, userCanDelete, userCanUpdate])

  const closeConfirm = useCallback(() => {
    setConfirmState(null)
  }, [])

  return {
    processing: processing || isPending,
    isPending,
    confirmState,
    closeConfirm,
    handleMoreAction,
    moreMenuItems,
  }
}
