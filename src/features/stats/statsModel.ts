import { differenceInCalendarDays, format, startOfDay, subDays } from 'date-fns'
import type { MediaProgressRow, PlaybackSessionRow } from '@/shared/lib/api/stats'

// ─── Summary ──────────────────────────────────────────────────────────────────

export interface StatsSummary {
  booksFinished: number
  /** distinct calendar days with any listening activity */
  daysListened: number
  /** total hours listened (estimated from progress × duration) */
  totalHours: number
}

export function buildStatsSummary(progress: MediaProgressRow[]): StatsSummary {
  const booksFinished = progress.filter((p) => p.is_finished).length

  const daySet = new Set<string>()
  let totalSeconds = 0

  for (const p of progress) {
    const listened = (p.progress ?? 0) * (p.duration ?? 0)
    totalSeconds += listened

    const dateStr = p.last_update ?? p.started_at ?? p.finished_at
    if (dateStr) {
      daySet.add(format(new Date(dateStr), 'yyyy-MM-dd'))
    }
  }

  return {
    booksFinished,
    daysListened: daySet.size,
    totalHours: Math.round(totalSeconds / 3600),
  }
}

// ─── Daily chart (last 7 days) ────────────────────────────────────────────────

export interface DayPoint {
  /** yyyy-MM-dd */
  dateKey: string
  /** short weekday label */
  weekdayAbbr: string
  /** minutes listened that day */
  minutes: number
}

export interface DailyChartModel {
  series: DayPoint[]
  totalMinutes: number
  averageMinutes: number
  bestDayMinutes: number
  /** current streak in days with any listening */
  streakDays: number
  /** for SVG rendering */
  lineSpacing: number
  yTickValues: number[]
  /** [{x, y}] in SVG coordinate space */
  pointCentersSvg: { x: number; y: number }[]
  polylinePointsSvg: string
}

const CHART_WIDTH = 360
const CHART_HEIGHT = 288 // viewBox height — matches h-[18rem]
const CHART_MARGIN_LEFT = 0
const CHART_X_LABEL_BAND = 24 // px reserved at bottom for x labels
const CHART_PLOT_HEIGHT = CHART_HEIGHT - CHART_X_LABEL_BAND

/**
 * Build minutes-per-day from sessions for the last 7 days.
 * Uses playback_sessions.session_date when available, otherwise last_update.
 */
export function buildDaysListeningMap(
  progress: MediaProgressRow[],
  sessions: PlaybackSessionRow[]
): Record<string, number> {
  const map: Record<string, number> = {}

  // Use sessions if available (time_listening in seconds)
  for (const s of sessions) {
    const dateStr = s.session_date ?? s.updated_at
    if (!dateStr) continue
    const key = format(new Date(dateStr), 'yyyy-MM-dd')
    const mins = Math.round((s.time_listening ?? 0) / 60)
    map[key] = (map[key] ?? 0) + mins
  }

  // Fallback: if no sessions data, estimate from progress last_update dates
  if (sessions.length === 0) {
    for (const p of progress) {
      const dateStr = p.last_update
      if (!dateStr) continue
      const key = format(new Date(dateStr), 'yyyy-MM-dd')
      const estimated = Math.round(((p.progress ?? 0) * (p.duration ?? 0)) / 60)
      map[key] = (map[key] ?? 0) + estimated
    }
  }

  return map
}

export function buildDailyChartModel(daysListening: Record<string, number>, now: Date): DailyChartModel {
  // Build 7-day series ending today
  const series: DayPoint[] = []
  for (let i = 6; i >= 0; i--) {
    const d = subDays(now, i)
    const dateKey = format(d, 'yyyy-MM-dd')
    series.push({
      dateKey,
      weekdayAbbr: format(d, 'EEE'),
      minutes: daysListening[dateKey] ?? 0,
    })
  }

  const totalMinutes = series.reduce((s, d) => s + d.minutes, 0)
  const averageMinutes = Math.round(totalMinutes / 7)
  const bestDayMinutes = Math.max(...series.map((d) => d.minutes), 0)

  // Streak: consecutive days ending today that have > 0 minutes
  let streakDays = 0
  for (let i = 0; i < 365; i++) {
    const key = format(subDays(now, i), 'yyyy-MM-dd')
    if ((daysListening[key] ?? 0) > 0) streakDays++
    else break
  }

  // Y-axis: 7 tick values from 0 to maxVal (rounded up nicely)
  const maxVal = Math.max(bestDayMinutes, 30)
  const rawStep = maxVal / 6
  const niceStep = Math.ceil(rawStep / 5) * 5
  const yTickValues = Array.from({ length: 7 }, (_, i) => i * niceStep).reverse()
  const yMax = yTickValues[0]
  const lineSpacing = CHART_PLOT_HEIGHT / 7

  // SVG points — x evenly spread, y mapped from 0..yMax to plotHeight..0
  const xStep = CHART_WIDTH / 7
  const pointCentersSvg = series.map((d, i) => ({
    x: CHART_MARGIN_LEFT + xStep * i + xStep / 2,
    y: yMax > 0 ? CHART_PLOT_HEIGHT - (d.minutes / yMax) * CHART_PLOT_HEIGHT : CHART_PLOT_HEIGHT,
  }))

  const polylinePointsSvg = pointCentersSvg.map((p) => `${p.x},${p.y}`).join(' ')

  return {
    series,
    totalMinutes,
    averageMinutes,
    bestDayMinutes,
    streakDays,
    lineSpacing,
    yTickValues,
    pointCentersSvg,
    polylinePointsSvg,
  }
}

// ─── Heatmap (last ~52 weeks) ─────────────────────────────────────────────────

export const HEATMAP_BLOCK_PX = 13
export const HEATMAP_GAP_PX = 2
export const HEATMAP_CELL_PX = HEATMAP_BLOCK_PX - HEATMAP_GAP_PX
export const HEATMAP_INTENSITY_LEVELS = [1, 2, 3, 4] as const
export type HeatmapIntensity = 0 | 1 | 2 | 3 | 4

export interface HeatmapCellModel {
  dateString: string
  datePretty: string
  value: number // minutes
  intensity: HeatmapIntensity
  col: number
  row: number // 0=Sun … 6=Sat
}

export interface HeatmapMonthLabel {
  id: string
  label: string
  col: number
}

export interface ListeningHeatmapModel {
  cells: HeatmapCellModel[]
  monthLabels: HeatmapMonthLabel[]
  daysListenedInTheLastYear: number
  weeksToShow: number
  innerWidthPx: number
}

export function computeWeeksToShow(containerWidth: number): number {
  return Math.max(8, Math.floor((containerWidth - 28) / HEATMAP_BLOCK_PX))
}

export function computeInnerWidthPx(weeks: number): number {
  return weeks * HEATMAP_BLOCK_PX
}

function intensityForMinutes(minutes: number, p75: number): HeatmapIntensity {
  if (minutes <= 0) return 0
  if (p75 <= 0) return 1
  if (minutes < p75 * 0.25) return 1
  if (minutes < p75 * 0.5) return 2
  if (minutes < p75 * 0.75) return 3
  return 4
}

export function buildListeningHeatmapModel(
  daysListening: Record<string, number>,
  weeksToShow: number,
  now: Date = new Date()
): ListeningHeatmapModel {
  const today = startOfDay(now)
  const todayDow = today.getDay() // 0=Sun
  // Start of grid: Sunday before (weeksToShow * 7) days ago
  const totalDays = weeksToShow * 7
  const gridStart = subDays(today, totalDays - 1 + todayDow) // align to Sunday

  // Collect all values for percentile computation
  const values = Object.values(daysListening).filter((v) => v > 0)
  values.sort((a, b) => a - b)
  const p75 = values.length > 0 ? (values[Math.floor(values.length * 0.75)] ?? 0) : 0

  const cells: HeatmapCellModel[] = []
  const yearAgo = subDays(today, 364)
  let daysListenedInTheLastYear = 0

  for (let i = 0; i < totalDays; i++) {
    const day = subDays(today, totalDays - 1 - i)
    // Shift so first col aligns to gridStart
    const daysSinceGridStart = differenceInCalendarDays(day, gridStart)
    const col = Math.floor(daysSinceGridStart / 7)
    const row = day.getDay()
    const dateString = format(day, 'yyyy-MM-dd')
    const value = daysListening[dateString] ?? 0
    if (value > 0 && day >= yearAgo) daysListenedInTheLastYear++

    cells.push({
      dateString,
      datePretty: format(day, 'MMM d, yyyy'),
      value,
      intensity: intensityForMinutes(value, p75),
      col,
      row,
    })
  }

  // Month labels: first cell in each new month
  const seenMonths = new Set<string>()
  const monthLabels: HeatmapMonthLabel[] = []
  for (const cell of cells) {
    const monthKey = cell.dateString.slice(0, 7)
    if (!seenMonths.has(monthKey)) {
      seenMonths.add(monthKey)
      monthLabels.push({
        id: monthKey,
        label: format(new Date(cell.dateString + 'T00:00:00'), 'MMM'),
        col: cell.col,
      })
    }
  }

  return {
    cells,
    monthLabels,
    daysListenedInTheLastYear,
    weeksToShow,
    innerWidthPx: computeInnerWidthPx(weeksToShow),
  }
}
