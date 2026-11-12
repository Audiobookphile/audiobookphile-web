'use client'

import { formatDistanceToNow } from 'date-fns'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import SimpleDataTable, { DataTableColumn } from '@/shared/ui/SimpleDataTable'
import { MediaProgress, User } from '@/types/api'

export default function UserClient({ user }: { user: User }) {
  const t = useTypeSafeTranslations()

  const columns: DataTableColumn<MediaProgress>[] = [
    {
      label: t('LabelItem'),
      accessor: (mediaProgress) => mediaProgress.displayTitle,
    },
    {
      label: t('LabelProgress'),
      accessor: (mediaProgress) => `${Math.round(mediaProgress.progress * 100)}%`,
      cellClassName: 'text-center',
      headerClassName: 'text-center',
    },
    {
      label: t('LabelStartedAt'),
      accessor: (mediaProgress) =>
        mediaProgress.startedAt ? formatDistanceToNow(new Date(mediaProgress.startedAt), { addSuffix: true }) : '',
    },
    {
      label: t('LabelLastUpdate'),
      accessor: (mediaProgress) =>
        mediaProgress.lastUpdate ? formatDistanceToNow(new Date(mediaProgress.lastUpdate), { addSuffix: true }) : '',
    },
  ]

  return (
    <div className="flex flex-col gap-2 py-4">
      <div className="mb-2 flex items-center gap-2">
        <h1 className="text-xl">{user.username}</h1>
      </div>

      <div className="my-4 h-px w-full bg-border" />

      <h2 className="text-lg font-medium">{t('HeaderSavedMediaProgress')}</h2>
      <SimpleDataTable data={user.mediaProgress} columns={columns} getRowKey={(mediaProgress) => mediaProgress.id} />
    </div>
  )
}
