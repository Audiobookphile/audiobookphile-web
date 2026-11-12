'use client'

import { motion } from 'framer-motion'
import { BookOpen, Clock, HardDrive, Music, Users } from 'lucide-react'
import Link from 'next/link'
import { useLibraryStats } from '../hooks/useLibraryStats'

// Utility for formatting bytes
function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

// Utility for formatting duration in seconds to hours/days
function formatDuration(seconds: number) {
  if (!seconds) return '0 hours'
  const hours = seconds / 3600
  if (hours > 24) {
    const days = Math.floor(hours / 24)
    const remainingHours = Math.round(hours % 24)
    return `${days}d ${remainingHours}h`
  }
  return `${Math.round(hours)} hours`
}

export function LibraryStatsDashboard({ libraryId }: { libraryId: string }) {
  const { data: stats, isLoading, isError } = useLibraryStats(libraryId)

  if (isLoading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-accent opacity-60" />
      </div>
    )
  }

  if (isError || !stats) {
    return (
      <div className="flex w-full items-center justify-center p-12 text-foreground-muted">
        Failed to load library stats.
      </div>
    )
  }

  const topGenres = (Array.isArray(stats.genresWithCount) ? stats.genresWithCount : [])
    .slice()
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((stat) => ({
      label: stat.genre,
      percentage: Math.round((stat.count / Math.max(1, stats.totalItems)) * 100),
    }))

  const topAuthors = (Array.isArray(stats.authorsWithCount) ? stats.authorsWithCount : [])
    .slice()
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((stat) => ({
      id: stat.id,
      label: stat.name,
      numBooks: stat.count,
    }))

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  }

  const itemAnim = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-12 pb-12">
      <div className="flex flex-col space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-white/90">Library Stats</h1>
        <p className="text-white/50">Overview of your library contents and metrics.</p>
      </div>

      {/* Summary Cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="flex flex-wrap justify-center gap-6">
        <motion.div variants={itemAnim} className="flex p-2">
          <BookOpen className="mr-3 h-12 w-12 text-accent/80" />
          <div className="flex flex-col">
            <p className="text-4xl leading-none font-bold text-white">{stats.totalItems.toLocaleString()}</p>
            <p className="text-sm text-white/50">Items in Library</p>
          </div>
        </motion.div>

        <motion.div variants={itemAnim} className="flex p-2">
          <Clock className="mr-3 h-12 w-12 text-accent/80" />
          <div className="flex flex-col">
            <p className="text-4xl leading-none font-bold text-white">{formatDuration(stats.totalDuration)}</p>
            <p className="text-sm text-white/50">Overall Runtime</p>
          </div>
        </motion.div>

        <motion.div variants={itemAnim} className="flex p-2">
          <Users className="mr-3 h-12 w-12 text-accent/80" />
          <div className="flex flex-col">
            <p className="text-4xl leading-none font-bold text-white">{stats.totalAuthors.toLocaleString()}</p>
            <p className="text-sm text-white/50">Total Authors</p>
          </div>
        </motion.div>

        <motion.div variants={itemAnim} className="flex p-2">
          <HardDrive className="mr-3 h-12 w-12 text-accent/80" />
          <div className="flex flex-col">
            <p className="text-4xl leading-none font-bold text-white">{formatBytes(stats.totalSize)}</p>
            <p className="text-sm text-white/50">Total Size</p>
          </div>
        </motion.div>

        <motion.div variants={itemAnim} className="flex p-2">
          <Music className="mr-3 h-12 w-12 text-accent/80" />
          <div className="flex flex-col">
            <p className="text-4xl leading-none font-bold text-white">{stats.numAudioTracks.toLocaleString()}</p>
            <p className="text-sm text-white/50">Audio Tracks</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Genres & Authors Section */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-16"
      >
        {/* Top Genres */}
        <motion.div
          variants={itemAnim}
          className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md"
        >
          <h2 className="mb-6 text-2xl font-semibold text-white/90">Top 5 Genres</h2>
          {topGenres.length === 0 && <p className="text-white/50">No genres found.</p>}
          {topGenres.map((stat, index) => (
            <div key={index} className="w-full py-3">
              <div className="mb-2 flex items-end justify-between">
                <p className="text-2xl font-bold text-white/90">{stat.percentage}%</p>
                <p className="text-white/70">{stat.label}</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stat.percentage}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full rounded-full bg-accent"
                />
              </div>
            </div>
          ))}
        </motion.div>

        {/* Top Authors */}
        <motion.div
          variants={itemAnim}
          className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md"
        >
          <h2 className="mb-6 text-2xl font-semibold text-white/90">Top 10 Authors</h2>
          {topAuthors.length === 0 && <p className="text-white/50">No authors found.</p>}
          {topAuthors.map((stat, index) => (
            <div key={index} className="mb-2 flex w-full items-center py-2">
              <span className="pr-2 text-sm text-white/50">{index + 1}.</span>
              <Link
                href={`/library/${libraryId}/author/${stat.id}`}
                className="truncate pr-4 text-sm text-white/70 hover:text-white hover:underline"
              >
                {stat.label}
              </Link>
              <div className="h-1 grow overflow-hidden rounded-full border-b border-dotted border-white/10" />
              <div className="ml-4 w-8 text-right">
                <p className="text-sm font-bold text-white/90">{stat.numBooks}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Longest & Largest Items */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-16"
      >
        {/* Longest Items */}
        <motion.div
          variants={itemAnim}
          className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md"
        >
          <h2 className="mb-6 text-2xl font-semibold text-white/90">Longest Items</h2>
          {(Array.isArray(stats.longestItems) ? stats.longestItems : []).length === 0 && (
            <p className="text-white/50">No items found.</p>
          )}
          {(Array.isArray(stats.longestItems) ? stats.longestItems : []).map((stat, index) => (
            <div key={index} className="mb-2 flex w-full items-center justify-between py-2">
              <span className="pr-2 text-sm text-white/50">{index + 1}.</span>
              <Link
                href={`/library/${libraryId}/book/${stat.id}`}
                className="w-3/4 truncate pr-4 text-sm text-white/70 hover:text-white hover:underline"
              >
                {stat.title}
              </Link>
              <div className="w-1/4 shrink-0 text-right">
                <p className="text-sm font-bold text-white/90">{formatDuration(stat.duration)}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Largest Items */}
        <motion.div
          variants={itemAnim}
          className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md"
        >
          <h2 className="mb-6 text-2xl font-semibold text-white/90">Largest Items</h2>
          {(Array.isArray(stats.largestItems) ? stats.largestItems : []).length === 0 && (
            <p className="text-white/50">No items found.</p>
          )}
          {(Array.isArray(stats.largestItems) ? stats.largestItems : []).map((stat, index) => (
            <div key={index} className="mb-2 flex w-full items-center justify-between py-2">
              <span className="pr-2 text-sm text-white/50">{index + 1}.</span>
              <Link
                href={`/library/${libraryId}/book/${stat.id}`}
                className="w-3/4 truncate pr-4 text-sm text-white/70 hover:text-white hover:underline"
              >
                {stat.title}
              </Link>
              <div className="w-1/4 shrink-0 text-right">
                <p className="text-sm font-bold whitespace-nowrap text-white/90">{formatBytes(stat.size)}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}
