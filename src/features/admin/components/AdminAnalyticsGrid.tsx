'use client'

import { motion, Variants } from 'framer-motion'
import { Activity, Book, Database, Users } from 'lucide-react'

export interface AdminAnalyticsData {
  totalUsers: number | null
  totalLibraries: number | null
  totalItems: number | null
  activeSessions: number | null
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    },
  },
}

export function AdminAnalyticsGrid({ data }: { data: AdminAnalyticsData }) {
  const kpis = [
    {
      title: 'Total Users',
      value: data.totalUsers,
      icon: Users,
      color: 'bg-amber-500',
      iconColor: 'text-amber-400',
      trend: '+12% this week',
      trendColor: 'text-amber-400 bg-amber-500/15 border border-amber-500/20',
    },
    {
      title: 'Active Playback Sessions',
      value: data.activeSessions,
      icon: Activity,
      color: 'bg-emerald-500',
      iconColor: 'text-emerald-400',
      trend: 'Live',
      trendColor: 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/20',
    },
    {
      title: 'Total Library Items',
      value: data.totalItems,
      icon: Book,
      color: 'bg-accent',
      iconColor: 'text-accent',
      trend: '+45 this month',
      trendColor: 'text-accent bg-accent/15 border border-accent/20',
    },
    {
      title: 'Libraries Configured',
      value: data.totalLibraries,
      icon: Database,
      color: 'bg-orange-500',
      iconColor: 'text-orange-400',
      trend: 'Stable',
      trendColor: 'text-orange-400 bg-orange-500/15 border border-orange-500/20',
    },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
    >
      {kpis.map((kpi) => (
        <motion.div
          key={kpi.title}
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl border border-border bg-primary/80 p-6 shadow-xl backdrop-blur-md transition-all hover:border-accent/40 hover:bg-primary-hover"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground-muted">{kpi.title}</p>
            <div className={`rounded-lg p-2 ${kpi.color}/15`}>
              <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-1">
            <h2 className="text-4xl font-bold tracking-tight text-foreground">
              {kpi.value === null || kpi.value === undefined ? '—' : kpi.value.toLocaleString()}
            </h2>
            <span
              className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${kpi.trendColor}`}
            >
              {kpi.trend}
            </span>
          </div>

          {/* Decorative background circle */}
          <div className={`absolute -right-6 -bottom-6 h-24 w-24 rounded-full ${kpi.color} opacity-10 blur-xl`} />
        </motion.div>
      ))}
    </motion.div>
  )
}
