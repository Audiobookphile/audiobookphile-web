'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Bell, X } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useTasks } from '@/shared/contexts/TasksContext'
import { useClickOutside } from '@/shared/hooks/useClickOutside'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { Task } from '@/types/api'
import Tooltip from '../ui/Tooltip'
import ItemTaskRunningCard from './ItemTaskRunningCard'
import LoadingSpinner from './LoadingSpinner'

function getActionLink(task: Task): string {
  const libraryId = task.data?.libraryId
  const libraryItemId = task.data?.libraryItemId

  switch (task.action) {
    case 'download-podcast-episode':
      return libraryId ? `/library/${libraryId}/podcast/download-queue` : ''
    case 'encode-m4b':
    case 'embed-metadata':
    case 'scan-item':
      return libraryId && libraryItemId ? `/library/${libraryId}/item/${libraryItemId}` : ''
    default:
      return ''
  }
}

interface NotificationWidgetProps {
  className?: string
}

export default function NotificationWidget({ className = '' }: NotificationWidgetProps) {
  const t = useTypeSafeTranslations()
  const { tasks } = useTasks()
  const [showMenu, setShowMenu] = useState(false)
  const [tasksSeen, setTasksSeen] = useState<string[]>([])

  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const tasksRunning = useMemo(() => {
    return tasks.some((task) => !task.isFinished)
  }, [tasks])

  const tasksToShow = useMemo(() => {
    return [...tasks].sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0)).slice(0, 50)
  }, [tasks])

  const showUnseenSuccessIndicator = useMemo(() => {
    return tasksToShow.some((task) => task.isFinished && !task.isFailed && !tasksSeen.includes(task.id))
  }, [tasksSeen, tasksToShow])

  const closeMenu = useCallback(() => {
    setShowMenu(false)
  }, [])

  useClickOutside(menuRef, triggerRef, closeMenu)

  const clickShowMenu = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      event.preventDefault()

      setShowMenu((prev) => {
        const next = !prev

        if (next) {
          setTasksSeen((previous) => {
            const seenTaskIds = new Set(previous)
            tasksToShow.forEach((task) => seenTaskIds.add(task.id))
            return Array.from(seenTaskIds)
          })
        }

        return next
      })
    },
    [tasksToShow]
  )

  if (!tasksToShow.length) {
    return null
  }

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        className="relative flex h-10 w-10 cursor-pointer items-center justify-center text-foreground/70 transition-all duration-300 hover:scale-110 hover:text-white active:scale-95"
        aria-haspopup="listbox"
        aria-expanded={showMenu}
        onClick={clickShowMenu}
      >
        {tasksRunning ? (
          <Tooltip text={t('LabelTasks')} position="bottom" className="flex items-center">
            <span className="relative">
              <LoadingSpinner className="scale-110 !cursor-pointer" />
              {showUnseenSuccessIndicator && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="pointer-events-none absolute -top-1 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-success"
                />
              )}
            </span>
          </Tooltip>
        ) : (
          <Tooltip text={t('LabelActivities')} position="bottom" className="flex items-center">
            <span className="relative">
              <Bell size={20} className={showMenu ? 'text-white' : ''} aria-label={t('LabelActivities')} />
              {showUnseenSuccessIndicator && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  className="pointer-events-none absolute -top-1 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-success shadow-[0_0_12px_rgba(34,197,94,0.6)]"
                />
              )}
            </span>
          </Tooltip>
        )}
      </button>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed top-16 right-4 left-auto z-[100] mt-0 w-auto max-w-[24rem] min-w-[20rem] overflow-hidden rounded-2xl border border-white/10 bg-primary/95 text-base shadow-2xl ring-1 ring-black/20 backdrop-blur-2xl focus:outline-none md:mt-1.5"
            style={{ maxHeight: '80vh', willChange: 'transform, opacity' }}
          >
            <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3">
              <h3 className="text-[10px] font-black tracking-[0.2em] text-white/50 uppercase">
                {t('LabelActivities')}
              </h3>
              <button
                type="button"
                aria-label={t('ButtonCloseModal')}
                onClick={closeMenu}
                className="rounded-md p-2 text-white/30 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={14} className="opacity-70" aria-hidden="true" />
              </button>
            </div>
            <ul
              className="scrollbar-hide h-full max-h-[calc(80vh-3rem)] w-full overflow-y-auto py-2"
              role="listbox"
              aria-label={t('LabelTasks')}
            >
              {tasksToShow.map((task) => {
                const actionLink = getActionLink(task)

                if (actionLink) {
                  return (
                    <li key={task.id} className="relative select-none">
                      <Link
                        href={actionLink}
                        onClick={closeMenu}
                        className="block cursor-pointer px-1 py-0.5 transition-colors hover:bg-white/5"
                      >
                        <ItemTaskRunningCard task={task} />
                      </Link>
                    </li>
                  )
                }

                return (
                  <li key={task.id} className="relative px-1 py-0.5 transition-colors select-none hover:bg-white/5">
                    <ItemTaskRunningCard task={task} />
                  </li>
                )
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
