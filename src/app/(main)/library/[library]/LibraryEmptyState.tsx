import { motion } from 'framer-motion'
import { FolderSearch, Library as LibraryIcon, PlusCircle, Podcast } from 'lucide-react'
import { useMemo, useTransition } from 'react'
import { useTasks } from '@/shared/contexts/TasksContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { mergeClasses } from '@/shared/lib/merge-classes'
import Btn from '@/shared/ui/Btn'
import { Library } from '@/types/api'
import { requestScanLibrary } from '../../settings/libraries/actions'

interface LibraryEmptyStateProps {
  library: Library
  showScanButton: boolean
}

export default function LibraryEmptyState({ library, showScanButton }: LibraryEmptyStateProps) {
  const t = useTypeSafeTranslations()
  const [isPending, startTransition] = useTransition()
  const { getTasksByLibraryId } = useTasks()

  const isLibraryTaskRunning = useMemo(() => {
    return getTasksByLibraryId(library.id).some((task) => task.action === 'library-scan' && !task.isFinished)
  }, [getTasksByLibraryId, library.id])

  const handleScanLibrary = () => {
    startTransition(async () => {
      try {
        await requestScanLibrary(library.id)
      } catch (error) {
        console.error('Failed to scan library', error)
      }
    })
  }

  const Icon = library.mediaType === 'podcast' ? Podcast : LibraryIcon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="mx-auto flex w-full max-w-lg flex-col items-center justify-center gap-6 px-4 py-20 text-center"
    >
      <div className="relative">
        <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-primary/20 blur-3xl"></div>
        <motion.div
          animate={{ rotate: isLibraryTaskRunning ? 360 : 0 }}
          transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
          className={mergeClasses(
            'from-primary/10 to-primary/30 border-primary/20 relative rounded-3xl border bg-gradient-to-br p-6 shadow-xl',
            isLibraryTaskRunning ? 'animate-pulse' : 'shadow-primary/10'
          )}
        >
          {isLibraryTaskRunning ? (
            <FolderSearch size={64} className="text-primary drop-shadow-md" />
          ) : (
            <Icon size={64} className="text-primary drop-shadow-md" />
          )}
        </motion.div>
      </div>

      <div className="space-y-2">
        <h2 className="bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-3xl font-black tracking-tight text-transparent">
          {t('MessageXLibraryIsEmpty', { 0: library.name })}
        </h2>
        <p className="max-w-md text-lg text-foreground-muted">
          {isLibraryTaskRunning
            ? 'We are currently scanning your files. This might take a moment.'
            : 'It looks like there are no items here yet. Scan your library folder to discover media.'}
        </p>
      </div>

      {showScanButton && (
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="mt-4">
          <Btn
            size="large"
            color="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
            onClick={handleScanLibrary}
            loading={isPending || isLibraryTaskRunning}
            className="flex items-center gap-2 rounded-full px-8 py-4 font-bold tracking-wide"
          >
            <PlusCircle size={20} />
            {t('ButtonScanLibrary')}
          </Btn>
        </motion.div>
      )}
    </motion.div>
  )
}
