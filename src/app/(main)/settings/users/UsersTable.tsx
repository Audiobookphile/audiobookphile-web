'use client'

import { formatDistanceToNow } from 'date-fns'
import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { useGlobalToast } from '@/shared/contexts/ToastContext'
import { useUser } from '@/shared/contexts/UserContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { formatJsDate, formatJsDatetime } from '@/shared/lib/datefns'
import IconBtn from '@/shared/ui/IconBtn'
import SimpleDataTable, { DataTableColumn } from '@/shared/ui/SimpleDataTable'
import Tooltip from '@/shared/ui/Tooltip'
import ConfirmDialog from '@/shared/widgets/ConfirmDialog'
import OnlineIndicator from '@/shared/widgets/OnlineIndicator'
import { Profile } from '@/types'
import { deleteUser } from './actions'

interface UsersTableProps {
  profiles: Profile[]
  dateFormat: string
  timeFormat: string
}

export default function UsersTable({ profiles, dateFormat, timeFormat }: UsersTableProps) {
  const t = useTypeSafeTranslations()
  const router = useRouter()
  const { showToast } = useGlobalToast()
  const { user } = useUser()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const deletingUserRef = useRef<Profile | null>(null)
  const currentUserId = user.id

  const handleDeleteClick = useCallback((profile: Profile) => {
    deletingUserRef.current = profile
    setShowConfirmDialog(true)
  }, [])

  const handleConfirmDeleteUser = useCallback(async () => {
    if (!deletingUserRef.current) return
    setShowConfirmDialog(false)

    const profileToDelete = deletingUserRef.current
    setDeletingUserId(profileToDelete.id)

    try {
      await deleteUser(profileToDelete.id)
      showToast(t('ToastUserDeleteSuccess'), { type: 'success' })
    } catch (error) {
      showToast(t('ToastUserDeleteFailed'), { type: 'error' })
      console.error('Failed to delete user:', error)
    } finally {
      setDeletingUserId(null)
      deletingUserRef.current = null
    }
  }, [showToast, t])

  const columns: DataTableColumn<Profile>[] = [
    {
      label: t('LabelUsername'),
      accessor: (profile) => (
        <div className="flex items-center gap-2">
          <OnlineIndicator value={profile.id === currentUserId} />
          <p className="text-base font-medium">{profile.username ?? profile.id}</p>
        </div>
      ),
    },
    {
      label: t('LabelAccountType'),
      accessor: 'user_type',
    },
    {
      label: t('LabelCreatedAt'),
      accessor: (profile) => {
        if (!profile.created_at) return ''
        return (
          <Tooltip text={formatJsDatetime(new Date(profile.created_at), dateFormat, timeFormat)} position="top">
            <span className="text-xs">{formatJsDate(new Date(profile.created_at), dateFormat)}</span>
          </Tooltip>
        )
      },
    },
    {
      label: t('LabelLastSeen'),
      accessor: (profile) => {
        if (!profile.updated_at) return ''
        return (
          <Tooltip text={formatJsDatetime(new Date(profile.updated_at), dateFormat, timeFormat)} position="top">
            <span className="text-xs">{formatDistanceToNow(new Date(profile.updated_at), { addSuffix: true })}</span>
          </Tooltip>
        )
      },
    },
    {
      label: '',
      accessor: (profile) => (
        <div className="flex items-center justify-end gap-1">
          {profile.user_type !== 'root' && (
            <IconBtn
              ariaLabel={t('ButtonUserDelete', { 0: profile.username ?? profile.id })}
              borderless
              size="small"
              className="text-foreground-muted hover:not-disabled:text-error"
              loading={deletingUserId === profile.id}
              onClick={(event) => {
                event.stopPropagation()
                handleDeleteClick(profile)
              }}
              icon={Trash2}
            />
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <SimpleDataTable
        data={profiles}
        columns={columns}
        getRowKey={(profile) => profile.id}
        onRowClick={(profile) => router.push(`/settings/users/${profile.id}`)}
      />
      <ConfirmDialog
        isOpen={showConfirmDialog}
        message={t('MessageRemoveUserWarning', { 0: deletingUserRef.current?.username || '' })}
        yesButtonText={t('ButtonDelete')}
        yesButtonClassName="bg-error text-white"
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmDeleteUser}
      />
    </>
  )
}
