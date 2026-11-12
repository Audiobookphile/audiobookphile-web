'use client'

import { GripVertical } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useMemo } from 'react'
import { useTasks } from '@/shared/contexts/TasksContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { escapeHtml } from '@/shared/lib/escape'
import Btn from '@/shared/ui/Btn'
import ContextMenuDropdown, { ContextMenuDropdownItem } from '@/shared/ui/ContextMenuDropdown'
import LibraryIcon from '@/shared/ui/LibraryIcon'
import LoadingSpinner from '@/shared/widgets/LoadingSpinner'
import { Library } from '@/types/api'
import { matchAll, requestScanLibrary } from './actions'

interface LibrariesListRowProps {
  item: Library
  handleDeleteLibrary: (library: Library) => void
  handleEditLibrary: (library: Library) => void
}

export default function LibrariesListRow({ item, handleDeleteLibrary, handleEditLibrary }: LibrariesListRowProps) {
  const t = useTypeSafeTranslations()
  const { getTasksByLibraryId } = useTasks()

  const libraryTasks = useMemo(() => getTasksByLibraryId(item.id), [getTasksByLibraryId, item.id])

  const isLibraryTaskRunning = useMemo(() => {
    return libraryTasks.find(
      (task) => (task.action === 'library-scan' || task.action === 'library-match-all') && !task.isFinished
    )
  }, [libraryTasks])

  const contextMenuItems: ContextMenuDropdownItem[] = [
    { text: t('ButtonEdit'), action: 'edit' },
    { text: t('ButtonScan'), action: 'scan' },
    { text: t('ButtonDelete'), action: 'delete' },
  ]

  if (item.mediaType === 'book') {
    contextMenuItems.splice(2, 0, { text: t('ButtonMatchBooks'), action: 'matchBooks' })
  }

  const handleScanLibrary = useCallback(() => {
    try {
      void requestScanLibrary(item.id)
    } catch (error) {
      console.error('Failed to start scan', error)
    }
  }, [item.id])

  const handleMatchBooks = useCallback(() => {
    try {
      void matchAll(item.id)
    } catch (error) {
      console.error('Failed to start matching', error)
    }
  }, [item.id])

  const handleContextMenuActions = useCallback(
    (params: { action: string; data?: Record<string, string> }) => {
      switch (params.action) {
        case 'edit':
          handleEditLibrary(item)
          break
        case 'delete':
          handleDeleteLibrary(item)
          break
        case 'scan':
          handleScanLibrary()
          break
        case 'matchBooks':
          handleMatchBooks()
          break
      }
    },
    [handleDeleteLibrary, handleEditLibrary, handleMatchBooks, handleScanLibrary, item]
  )

  return (
    <div className="flex items-center gap-4 border-b border-white/5 px-4 py-2 text-foreground/50 transition-all duration-200 hover:bg-white/5 hover:text-foreground">
      {isLibraryTaskRunning ? <LoadingSpinner size="la-sm" /> : <LibraryIcon icon={item.icon} className="opacity-80" />}
      <Link
        prefetch={true}
        className="py-2 text-[13px] font-bold text-foreground transition-colors hover:text-primary"
        href={`/library/${item.id}`}
      >
        {escapeHtml(item.name)}
      </Link>
      <div className="grow" />
      {!isLibraryTaskRunning && (
        <div className="flex items-center gap-2">
          <Btn
            color="bg-white/5"
            className="h-auto border border-white/10 px-4 py-1.5 text-[11px] font-black tracking-widest uppercase"
            size="small"
            onClick={handleScanLibrary}
            disabled={isLibraryTaskRunning}
          >
            {t('ButtonScan')}
          </Btn>
          <ContextMenuDropdown
            usePortal
            borderless
            size="small"
            items={contextMenuItems}
            onAction={handleContextMenuActions}
          />
        </div>
      )}
      <div className="drag-handle cursor-grab rounded-md p-1 transition-colors hover:bg-white/10 active:cursor-grabbing">
        <GripVertical size={18} className="opacity-30" />
      </div>
    </div>
  )
}
