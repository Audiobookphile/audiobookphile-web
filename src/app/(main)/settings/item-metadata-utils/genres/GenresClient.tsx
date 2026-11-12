'use client'

import { useMemo, useTransition } from 'react'
import { useGlobalToast } from '@/shared/contexts/ToastContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import type { EditListItem } from '@/shared/ui/EditList'
import EditList from '@/shared/ui/EditList'
import { removeGenre, renameGenre } from './actions'

export default function GenresClient({ genres }: { genres: string[] }) {
  const { showToast } = useGlobalToast()
  const t = useTypeSafeTranslations()
  const [isPending, startTransition] = useTransition()

  const genresList = useMemo(() => {
    return genres.map((genre) => ({
      id: genre,
      name: genre,
    }))
  }, [genres])

  const handleDelete = async (item: EditListItem) => {
    if (isPending) return
    startTransition(async () => {
      const response = await removeGenre(item.name)

      if (response?.numItemsUpdated) {
        const numItemsUpdated = response.numItemsUpdated || 0
        showToast(t('MessageItemsUpdated', { 0: numItemsUpdated.toString() }), { type: 'success' })
      }
    })
  }

  const handleSave = async (genreToUpdate: EditListItem, newGenreName: string) => {
    if (isPending) return
    startTransition(async () => {
      const response = await renameGenre(genreToUpdate.name, newGenreName)

      if (response?.numItemsUpdated) {
        const numItemsUpdated = response.numItemsUpdated || 0
        showToast(t('MessageItemsUpdated', { 0: numItemsUpdated.toString() }), { type: 'success' })
      }
    })
  }

  return (
    <div className="py-4">
      <EditList items={genresList} onItemEditSaveClick={handleSave} onItemDeleteClick={handleDelete} listType="Genre" />
    </div>
  )
}
