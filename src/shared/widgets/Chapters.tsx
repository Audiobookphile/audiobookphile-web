'use client'

import { useMemo } from 'react'
import { useUser } from '@/shared/contexts/UserContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import Btn from '@/shared/ui/Btn'
import { BookLibraryItem, Chapter } from '@/types/api'
import ChaptersTable from '../../features/player/components/ChaptersTable'

interface ChaptersProps {
  libraryItem: BookLibraryItem
}

export default function Chapters({ libraryItem }: ChaptersProps) {
  const t = useTypeSafeTranslations()
  const { userCanUpdate } = useUser()

  const chapters = useMemo<Chapter[]>(() => libraryItem.media?.chapters || [], [libraryItem.media?.chapters])

  return (
    <div
      className="h-full w-full overflow-x-hidden overflow-y-auto px-4 py-6"
      role="region"
      aria-label={t('HeaderChapters')}
    >
      <div className="mb-4 w-full">
        {chapters.length > 0 ? (
          <ChaptersTable libraryItem={libraryItem} keepOpen />
        ) : (
          <div className="py-4 text-center" role="status">
            <p className="mb-8 text-xl">{t('MessageNoChapters')}</p>
            {userCanUpdate && (
              <Btn to={`/library/${libraryItem.libraryId}/item/${libraryItem.id}/chapters`}>
                {t('ButtonAddChapters')}
              </Btn>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
