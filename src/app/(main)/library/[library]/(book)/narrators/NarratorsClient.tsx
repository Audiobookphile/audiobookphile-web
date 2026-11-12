'use client'

import { useTransition } from 'react'
import { useGlobalToast } from '@/shared/contexts/ToastContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import type { EditListItem } from '@/shared/ui/EditList'
import EditList from '@/shared/ui/EditList'
import { deleteNarrator, saveNarrator } from './actions'

export default function NarratorsClient({
  libraryId,
  narrators,
}: {
  libraryId: string
  narrators: Array<{ id: string; name: string }>
}) {
  const { showToast } = useGlobalToast()
  const t = useTypeSafeTranslations()
  const [isPending, startTransition] = useTransition()

  const handleSave = async (item: EditListItem, newName: string) => {
    if (isPending) return

    startTransition(async () => {
      const response = await saveNarrator(libraryId, item.id, newName)

      if (response?.updated !== undefined) {
        const numItemsUpdated = response.updated || 0
        showToast(t('MessageItemsUpdated', { 0: numItemsUpdated.toString() }), { type: 'success' })
      }
    })
  }

  const handleDelete = async (item: EditListItem) => {
    if (isPending) return

    startTransition(async () => {
      const response = await deleteNarrator(libraryId, item.id)

      if (response?.updated !== undefined) {
        const numItemsUpdated = response.updated || 0
        showToast(t('MessageItemsUpdated', { 0: numItemsUpdated.toString() }), { type: 'success' })
      }
    })
  }

  return (
    <div>
      <EditList
        libraryId={libraryId}
        items={narrators}
        onItemEditSaveClick={handleSave}
        onItemDeleteClick={handleDelete}
        listType="Narrator"
      />
    </div>
  )
}
