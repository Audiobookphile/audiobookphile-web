'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { mergeClasses } from '@/shared/lib/merge-classes'

interface BookShelfRowProps {
  title: string
  children: React.ReactNode
  className?: string
}

export default function BookShelfRow({ title, children, className }: BookShelfRowProps) {
  const t = useTypeSafeTranslations()
  const shelfRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const checkCanScroll = useCallback(() => {
    if (!shelfRef.current) return
    const { clientWidth, scrollWidth, scrollLeft } = shelfRef.current
    if (scrollWidth > clientWidth) {
      setCanScrollRight(Math.ceil(scrollLeft) + clientWidth < scrollWidth)
      setCanScrollLeft(scrollLeft > 0)
    } else {
      setCanScrollRight(false)
      setCanScrollLeft(false)
    }
  }, [])

  useEffect(() => {
    checkCanScroll()
    window.addEventListener('resize', checkCanScroll)
    return () => window.removeEventListener('resize', checkCanScroll)
  }, [checkCanScroll, children]) // Re-check when children change

  const handleScroll = () => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(() => {
      setIsScrolling(false)
      checkCanScroll()
    }, 50)
  }

  const scrollLeft = () => {
    if (!shelfRef.current) return
    setIsScrolling(true)
    shelfRef.current.scrollBy({ left: -window.innerWidth, behavior: 'smooth' })
  }

  const scrollRight = () => {
    if (!shelfRef.current) return
    setIsScrolling(true)
    shelfRef.current.scrollBy({ left: window.innerWidth, behavior: 'smooth' })
  }

  return (
    <div className={mergeClasses('content-visibility-auto relative w-full', className)}>
      <div
        ref={shelfRef}
        className="bookshelf-row categorizedBookshelfRow no-scroll relative w-full max-w-full overflow-x-auto overflow-y-hidden pl-4e md:pl-8e"
        onScroll={handleScroll}
      >
        <div className="flex h-full w-full items-center pt-6e pr-4e">{children}</div>
      </div>

      <div className="relative">
        <div className="categoryPlacard relative top-0 left-4e z-30 w-44e transform md:left-8e">
          <div className="flex h-full w-full items-center justify-center rounded-lg border border-white/10 bg-primary/95 px-4 py-1.5 shadow-lg backdrop-blur-xl">
            <h2 className="text-[10px] font-black tracking-[0.2em] text-white/90 uppercase">{title}</h2>
          </div>
        </div>

        <div className="absolute top-0 right-0 left-0 z-5 h-px w-full bg-white/5"></div>
      </div>

      <AnimatePresence>
        {canScrollLeft && !isScrolling && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute top-0 left-0 z-40 hidden h-[calc(100%-24px)] w-24 cursor-pointer items-center justify-start bg-gradient-to-r from-black/80 to-transparent pl-4 transition-all hover:pl-6 sm:flex"
            onClick={scrollLeft}
            aria-label={t('ButtonScrollLeft')}
          >
            <ChevronLeft size={48} strokeWidth={2.5} className="text-white drop-shadow-lg" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {canScrollRight && !isScrolling && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-0 right-0 z-40 hidden h-[calc(100%-24px)] w-24 cursor-pointer items-center justify-end bg-gradient-to-l from-black/80 to-transparent pr-4 transition-all hover:pr-6 sm:flex"
            onClick={scrollRight}
            aria-label={t('ButtonScrollRight')}
          >
            <ChevronRight size={48} strokeWidth={2.5} className="text-white drop-shadow-lg" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
