import DailyListeningChart from '@/features/stats/DailyListeningChart'
import ListeningHeatmap from '@/features/stats/ListeningHeatmap'
import RecentSessions from '@/features/stats/RecentSessions'
import StatsSummaryRow from '@/features/stats/StatsSummary'
import { buildDaysListeningMap, buildStatsSummary } from '@/features/stats/statsModel'
import { getCurrentUser } from '@/shared/lib/api'
import { getUserStatsData } from '@/shared/lib/api/stats'

export const dynamic = 'force-dynamic'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default async function AccountStatsPage() {
  let currentUser
  try {
    currentUser = await getCurrentUser()
  } catch {
    return null
  }

  if (!currentUser) {
    return null
  }

  const { mediaProgress, recentSessions } = await getUserStatsData()
  const summary = buildStatsSummary(mediaProgress)
  const daysListening = buildDaysListeningMap(mediaProgress, recentSessions)

  return (
    <div className="mx-auto w-full max-w-4xl p-6 md:p-8">
      <h1 className="mb-6 text-2xl font-semibold">Your Stats</h1>

      {/* Summary row */}
      <div className="mb-8 rounded-lg border border-border p-4">
        <StatsSummaryRow summary={summary} />
      </div>

      {/* Chart + Recent sessions */}
      <div className="mb-8 flex flex-col gap-6 overflow-hidden md:flex-row md:items-start">
        <DailyListeningChart daysListening={daysListening} />
        <RecentSessions sessions={recentSessions} />
      </div>

      {/* Year heatmap */}
      <ListeningHeatmap daysListening={daysListening} />
    </div>
  )
}
