import { Edit3, Folder } from 'lucide-react'
import { useState, useTransition } from 'react'
import { useGlobalToast } from '@/shared/contexts/ToastContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import Btn from '@/shared/ui/Btn'
import IconBtn from '@/shared/ui/IconBtn'
import TextInput from '@/shared/ui/TextInput'
import { updateBackupPath } from './actions'

interface BackupLocationProps {
  backupLocation: string
  backupPathEnvSet: boolean
}

export default function BackupLocation({ backupLocation, backupPathEnvSet }: BackupLocationProps) {
  const t = useTypeSafeTranslations()
  const { showToast } = useGlobalToast()
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [editedBackupLocation, setEditedBackupLocation] = useState(backupLocation)

  const handleSave = () => {
    if (isPending) return

    const newBackupLocation = editedBackupLocation.trim()
    if (!newBackupLocation) {
      showToast(t('MessageBackupsLocationPathEmpty'), { type: 'error' })
      return
    }

    if (newBackupLocation === backupLocation) {
      setIsEditing(false)
      return
    }

    startTransition(async () => {
      const success = await updateBackupPath(newBackupLocation)
      if (success) {
        setIsEditing(false)
        setEditedBackupLocation(newBackupLocation)
      } else {
        showToast(t('ToastFailedToUpdate'), { type: 'error' })
      }
    })
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedBackupLocation(backupLocation)
  }

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-3">
        <Folder size={18} className="text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)]" />
        <p className="text-[11px] font-black tracking-widest text-white/40 uppercase">{t('LabelBackupLocation')}</p>
      </div>
      {isEditing ? (
        <div>
          <div className="flex items-center gap-2">
            <TextInput
              value={editedBackupLocation}
              disabled={backupPathEnvSet}
              className="text-sm"
              onChange={(value) => setEditedBackupLocation(value)}
            />
            {!backupPathEnvSet && (
              <Btn size="small" color="bg-success" onClick={handleSave}>
                {t('ButtonSave')}
              </Btn>
            )}

            <Btn size="small" onClick={handleCancel}>
              {t('ButtonCancel')}
            </Btn>
          </div>
          <p className="text-sm text-foreground-subdued">
            {backupPathEnvSet ? t('MessageBackupsLocationNoEditNote') : t('MessageBackupsLocationEditNote')}
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <p className="text-base break-all text-foreground">{backupLocation}</p>
          <IconBtn
            ariaLabel={t('LabelEdit')}
            borderless
            size="small"
            className="cursor-pointer text-white/40 transition-colors hover:text-primary"
            onClick={() => {
              setIsEditing(true)
            }}
          >
            <Edit3 size={16} />
          </IconBtn>
        </div>
      )}
    </div>
  )
}
