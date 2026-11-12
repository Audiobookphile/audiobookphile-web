'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'

export type ModalSideNavigationProps = {
  canGoPrev: boolean
  canGoNext: boolean
  onPrevAction: () => void
  onNextAction: () => void
}

/**
 * Left/right chevrons outside the modal panel (Vue EditModal-style).
 */
export default function ModalSideNavigation({
  canGoPrev,
  canGoNext,
  onPrevAction,
  onNextAction,
}: ModalSideNavigationProps) {
  const t = useTypeSafeTranslations()

  return (
    <div className="pointer-events-none absolute inset-0 z-[1]">
      <AnimatePresence>
        {canGoPrev && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="absolute start-[-8rem] top-0 bottom-0 flex h-full items-center px-6"
          >
            <motion.button
              whileHover={{ scale: 1.1, x: -4 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              className="group pointer-events-auto flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl transition-all hover:bg-white/10"
              aria-label={t('ButtonPrevious')}
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onPrevAction()
              }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <ChevronLeft
                size={40}
                className="text-foreground/40 drop-shadow-lg transition-colors duration-300 group-hover:text-primary"
              />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {canGoNext && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="absolute end-[-8rem] top-0 bottom-0 flex h-full items-center px-6"
          >
            <motion.button
              whileHover={{ scale: 1.1, x: 4 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              className="group pointer-events-auto flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl transition-all hover:bg-white/10"
              aria-label={t('ButtonNext')}
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onNextAction()
              }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <ChevronRight
                size={40}
                className="text-foreground/40 drop-shadow-lg transition-colors duration-300 group-hover:text-primary"
              />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
