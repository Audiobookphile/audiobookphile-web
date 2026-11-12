import { formatDistanceToNow } from 'date-fns'
import type { PlaybackSessionRow } from '@/shared/lib/api/stats'

interface RecentSessionsProps {
  sessions: PlaybackSessionRow[]
}

function formatMinutes(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '0m'
  const m = Math.round(seconds / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`
}

export default function RecentSessions({ sessions }: RecentSessionsProps) {
  if (!sessions.length) {
    return (
      <div className="mx-auto w-full md:mx-0 md:w-80 md:shrink-0">
        <h2 className="mb-4 text-xl font-semibold">Recent Sessions</h2>
        <p className="text-sm text-foreground-muted">No listening sessions yet.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full md:mx-0 md:w-80 md:shrink-0">
      <h2 className="mb-4 text-xl font-semibold">Recent Sessions</h2>
      <ul className="space-y-1.5">
        {sessions.map((item, index) => (
          <li key={item.id}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-1">
                <span className="w-7 shrink-0 text-sm text-foreground-muted tabular-nums">{index + 1}.</span>
                <div className="max-w-[14rem] min-w-0">
                  <p className="truncate text-sm text-foreground">{item.display_title ?? 'Unknown title'}</p>
                  <p className="text-xs text-foreground-subdued">
                    {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <p className="w-[4.5rem] shrink-0 text-right text-sm font-semibold text-foreground tabular-nums">
                {formatMinutes(item.time_listening)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
