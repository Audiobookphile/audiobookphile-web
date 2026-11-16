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
        className="bookshelf-row categorizedBookshelfRow no-scroll relative w-full max-w-full overflow-x-auto overflow-y-hidden pl-4 md:pl-8"
        onScroll={handleScroll}
      >
        <div className="flex h-full w-full items-center pt-6 pr-4">{children}</div>
      </div>

      <div className="relative">
        <div className="categoryPlacard relative top-0 left-4 z-30 inline-flex max-w-sm transform md:left-8">
          <div className="flex h-full w-full items-center justify-center rounded-full border border-white/10 bg-background/80 px-4 py-1 shadow-md backdrop-blur-xl">
            <h2 className="text-[10px] font-black tracking-[0.2em] text-foreground/90 uppercase">{title}</h2>
          </div>
        </div>

        <div className="absolute top-0 right-0 left-0 z-5 h-px w-full bg-white/5"></div>
      </div>

      <AnimatePresence>
        {canScrollLeft && !isScrolling && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-1/2 left-3 z-40 hidden -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-background/85 p-2.5 text-foreground shadow-2xl backdrop-blur-xl transition-all hover:scale-110 hover:border-primary/50 hover:bg-background/95 hover:text-primary active:scale-95 sm:flex"
            onClick={scrollLeft}
            aria-label={t('ButtonScrollLeft')}
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {canScrollRight && !isScrolling && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-1/2 right-3 z-40 hidden -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-background/85 p-2.5 text-foreground shadow-2xl backdrop-blur-xl transition-all hover:scale-110 hover:border-primary/50 hover:bg-background/95 hover:text-primary active:scale-95 sm:flex"
            onClick={scrollRight}
            aria-label={t('ButtonScrollRight')}
          >
            <ChevronRight size={20} strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
