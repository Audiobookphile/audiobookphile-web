import AppIcon from '@/shared/ui/AppIcon'
import type { StatsSummary } from './statsModel'

interface StatsSummaryProps {
  summary: StatsSummary
}

interface StatCardProps {
  icon: string
  value: number
  label: string
  locale?: string
}

function StatCard({ icon, value, label, locale = 'en' }: StatCardProps) {
  const formatted = new Intl.NumberFormat(locale).format(value)
  return (
    <div className="flex items-center gap-3 p-3">
      <AppIcon name={icon} className="hidden text-yellow-400 sm:block" size={48} strokeWidth={1.5} />
      <div>
        <p className="text-4xl leading-none font-bold text-foreground md:text-5xl">{formatted}</p>
        <p className="mt-1 text-sm text-foreground-muted">{label}</p>
      </div>
    </div>
  )
}

export default function StatsSummaryRow({ summary }: StatsSummaryProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <StatCard icon="auto_stories" value={summary.booksFinished} label="Books finished" />
      <StatCard icon="event" value={summary.daysListened} label="Days listened" />
      <StatCard icon="watch_later" value={summary.totalHours} label="Hours listening" />
    </div>
  )
}
