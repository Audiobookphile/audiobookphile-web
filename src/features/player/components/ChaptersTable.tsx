'use client'

import { Share2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGlobalToast } from '@/shared/contexts/ToastContext'
import { useUser } from '@/shared/contexts/UserContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { copyChapterTimestampLink } from '@/shared/lib/chapterLink'
import { secondsToTimestamp } from '@/shared/lib/datefns'
import Btn from '@/shared/ui/Btn'
import SimpleDataTable from '@/shared/ui/SimpleDataTable'
import CollapsibleSection from '@/shared/widgets/CollapsibleSection'
import { BookLibraryItem, Chapter } from '@/types/api'

interface ChaptersTableProps {
  libraryItem: BookLibraryItem
  keepOpen?: boolean
  expanded?: boolean
}

export default function ChaptersTable({
  libraryItem,
  keepOpen = false,
  expanded: expandedProp = false,
}: ChaptersTableProps) {
  const t = useTypeSafeTranslations()
  const { showToast } = useGlobalToast()
  const { userCanUpdate } = useUser()
  const [expanded, setExpanded] = useState(expandedProp)

  const chapters = useMemo<Chapter[]>(() => libraryItem.media?.chapters || [], [libraryItem.media?.chapters])

  // Sync expanded state with props (keepOpen takes precedence)
  useEffect(() => {
    setExpanded(keepOpen || expandedProp)
  }, [keepOpen, expandedProp])

  const handleGoToTimestamp = useCallback((time: number) => {
    // TODO: Implement playback at timestamp
    // Original functionality:
    // - Check if media is currently streaming
    // - If streaming: emit play-item event with startTime
    // - If not streaming: show confirmation prompt, then emit play-item event with startTime
    console.log('Go to timestamp:', time)
  }, [])

  const columns = useMemo(
    () => [
      {
        label: t('LabelTitle'),
        accessor: 'title' as const,
        headerClassName: 'text-start px-4',
        cellClassName: 'px-4',
      },
      {
        label: t('LabelStart'),
        headerClassName: 'text-center px-2',
        cellClassName: 'text-center px-2',
        accessor: (row: Chapter) => (
          <button
            type="button"
            className="cursor-pointer text-center font-mono hover:underline"
            onClick={(e) => {
              e.stopPropagation()
              handleGoToTimestamp(row.start)
            }}
            aria-label={`Go to timestamp ${secondsToTimestamp(row.start)}`}
          >
            {secondsToTimestamp(row.start)}
          </button>
        ),
      },
      {
        label: t('LabelDuration'),
        headerClassName: 'text-center px-2 w-16 md:w-24 min-w-16 md:min-w-24',
        cellClassName: 'text-center px-2 font-mono',
        accessor: (row: Chapter) => secondsToTimestamp(Math.max(0, row.end - row.start)),
        hiddenBelow: 'md' as const,
      },
      {
        label: '',
        headerClassName: 'text-end px-2 w-10',
        cellClassName: 'text-end px-2',
        accessor: (row: Chapter) => (
          <button
            type="button"
            className="cursor-pointer text-foreground-muted hover:text-accent p-1 rounded-md transition-colors"
            onClick={async (e) => {
              e.stopPropagation()
              try {
                await copyChapterTimestampLink({ chapter: row, itemId: libraryItem.id })
                showToast(`${t('ButtonCopiedToClipboard')} (${row.title})`, { type: 'success' })
              } catch (err) {
                console.error('Failed to copy chapter link', err)
              }
            }}
            title={`Copy link for ${row.title}`}
            aria-label={`Copy link for ${row.title}`}
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        ),
      },
    ],
    [t, handleGoToTimestamp, libraryItem.id, showToast]
  )

  const headerActions = useMemo(
    () =>
      userCanUpdate ? (
        <Btn
          to={`/library/${libraryItem.libraryId}/item/${libraryItem.id}/chapters`}
          color="bg-primary"
          size="small"
          className="me-2"
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          {t('ButtonEditChapters')}
        </Btn>
      ) : null,
    [userCanUpdate, libraryItem.libraryId, libraryItem.id, t]
  )

  return (
    <CollapsibleSection
      title={t('HeaderChapters')}
      count={chapters.length}
      expanded={expanded}
      onExpandedChange={setExpanded}
      keepOpen={keepOpen}
      headerActions={headerActions}
    >
      <SimpleDataTable data={chapters} columns={columns} getRowKey={(row) => row.id} />
    </CollapsibleSection>
  )
}
