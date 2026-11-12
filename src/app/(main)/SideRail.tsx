'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  BarChart2,
  Clock,
  Download,
  FolderHeart,
  Home,
  Layers,
  Library as LibraryIcon,
  ListMusic,
  Mic2,
  Plus,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLibrary } from '@/features/library/contexts/LibraryContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { getLibrarySlug } from '@/shared/lib/library-slugs'
import { mergeClasses } from '@/shared/lib/merge-classes'

export default function SideRail({ serverVersion, installSource }: { serverVersion: string; installSource: string }) {
  const pathname = usePathname()
  const t = useTypeSafeTranslations()
  const { library } = useLibrary()

  const currentLibraryId = library?.id ?? ''
  const librarySlug = library ? getLibrarySlug(library) : currentLibraryId
  const currentLibraryMediaType = library?.mediaType ?? 'book'

  const buttons = [
    {
      icon: Home,
      label: t('ButtonHome'),
      href: `/library/${librarySlug}`,
    },
    {
      icon: Clock,
      label: t('ButtonLatest'),
      href: `/library/${librarySlug}/latest`,
      mediaType: 'podcast',
    },
    {
      icon: LibraryIcon,
      label: t('ButtonLibrary'),
      href: `/library/${librarySlug}/items`,
    },
    {
      icon: Layers,
      label: t('ButtonSeries'),
      href: `/library/${librarySlug}/series`,
      mediaType: 'book',
    },
    {
      icon: FolderHeart,
      label: t('ButtonCollections'),
      href: `/library/${librarySlug}/collections`,
      mediaType: 'book',
    },
    {
      icon: ListMusic,
      label: t('ButtonPlaylists'),
      href: `/library/${librarySlug}/playlists`,
    },
    {
      icon: Users,
      label: t('ButtonAuthors'),
      href: `/library/${librarySlug}/authors`,
      mediaType: 'book',
    },
    {
      icon: Mic2,
      label: t('LabelNarrators'),
      href: `/library/${librarySlug}/narrators`,
      mediaType: 'book',
    },
    {
      icon: BarChart2,
      label: t('ButtonStats'),
      href: `/library/${librarySlug}/stats`,
      mediaType: 'book',
    },
    {
      icon: Plus,
      label: t('ButtonAdd'),
      href: `/library/${librarySlug}/add-podcast`,
      mediaType: 'podcast',
    },

    {
      icon: Download,
      label: t('ButtonDownloadQueue'),
      href: `/library/${librarySlug}/download-queue`,
      mediaType: 'podcast',
    },
    {
      icon: AlertTriangle,
      label: t('ButtonIssues'),
      href: `/library/${librarySlug}/issues`,
      hidden: true,
    },
  ]

  const filteredButtons = buttons.filter(
    (button) => (!button.mediaType || button.mediaType === currentLibraryMediaType) && !button.hidden
  )

  return (
    <aside className="z-10 hidden h-full max-h-[calc(100vh-4rem)] w-20 min-w-20 flex-col overflow-hidden border-e border-white/10 bg-primary/95 shadow-2xl backdrop-blur-xl md:flex">
      <div className="scrollbar-hide w-full flex-1 overflow-x-hidden overflow-y-auto py-2">
        {filteredButtons.map((button, index) => {
          const Icon = button.icon
          const isActive = pathname === button.href

          return (
            <motion.div
              key={button.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03, type: 'spring', stiffness: 300, damping: 25 }}
            >
              <Link
                href={button.href}
                prefetch={true}
                className={mergeClasses(
                  'text-foreground group relative flex h-20 w-full cursor-pointer flex-col items-center justify-center transition-all duration-300',
                  'hover:bg-white/5 active:scale-95',
                  isActive ? 'bg-white/5' : ''
                )}
              >
                <div className="relative mb-1">
                  <Icon
                    size={24}
                    className={mergeClasses(
                      'transition-all duration-300 group-hover:scale-110',
                      isActive ? 'text-accent' : 'text-foreground/40 group-hover:text-foreground/80'
                    )}
                  />
                  {isActive && (
                    <motion.div
                      layoutId="active-glow"
                      className="absolute inset-0 -z-10 rounded-full bg-accent/20 blur-md"
                    />
                  )}
                </div>

                <p
                  className={mergeClasses(
                    'px-1 text-center text-[9px] font-black tracking-[0.15em] uppercase transition-all duration-300',
                    isActive ? 'text-accent' : 'text-foreground/30 group-hover:text-foreground/60'
                  )}
                >
                  {button.label}
                </p>

                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="active-indicator"
                      initial={{ opacity: 0, scaleY: 0 }}
                      animate={{ opacity: 1, scaleY: 1 }}
                      exit={{ opacity: 0, scaleY: 0 }}
                      className="absolute start-0 top-1/4 h-1/2 w-1 rounded-r-full bg-accent shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                    />
                  )}
                </AnimatePresence>
              </Link>
            </motion.div>
          )
        })}
      </div>

      <div className="w-full border-t border-white/5 bg-black/10 px-2 py-4 backdrop-blur-sm">
        <div className="flex flex-col items-center justify-center opacity-40 transition-opacity duration-300 hover:opacity-100">
          <p className="font-mono text-[9px] font-bold tracking-tight text-foreground/80">v{serverVersion}</p>
          <p className="mt-0.5 text-[7px] font-black tracking-widest text-foreground/50 uppercase">{installSource}</p>
        </div>
      </div>
    </aside>
  )
}
