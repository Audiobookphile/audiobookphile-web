'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { buildDailyChartModel } from './statsModel'

const CHART_WIDTH = 360
const CHART_HEIGHT = 288
const CHART_X_LABEL_Y = CHART_HEIGHT - 8

interface DailyListeningChartProps {
  daysListening: Record<string, number>
}

interface StatBoxProps {
  label: string
  value: number
  sub: string
}

function StatBox({ label, value, sub }: StatBoxProps) {
  const fmt = new Intl.NumberFormat().format(value)
  return (
    <div className="text-center">
      <p className="text-sm text-foreground-muted">{label}</p>
      <p className="text-4xl leading-[0.9] font-semibold text-foreground">{fmt}</p>
      <p className="text-sm text-foreground-muted">{sub}</p>
    </div>
  )
}

export default function DailyListeningChart({ daysListening }: DailyListeningChartProps) {
  const tooltipRef = useRef<HTMLDivElement>(null)

  const model = useMemo(() => buildDailyChartModel(daysListening, new Date()), [daysListening])

  const { lineSpacing, yTickValues, series, pointCentersSvg, polylinePointsSvg } = model

  const summaryAriaLabel = series.map((d) => `${d.weekdayAbbr} ${d.minutes}m`).join(', ')

  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const [tooltipText, setTooltipText] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    if (!anchor || tooltipText == null || !tooltipRef.current) {
      setTooltipPos(null)
      return
    }
    const el = tooltipRef.current
    const tw = el.offsetWidth
    const th = el.offsetHeight
    let left = anchor.left + anchor.width / 2 - tw / 2
    if (left < 10) left = 10
    else if (left + tw > window.innerWidth - 10) left = window.innerWidth - 10 - tw
    setTooltipPos({ left, top: anchor.top - th - 4 })
  }, [anchor, tooltipText])

  const hideTooltip = () => {
    setAnchor(null)
    setTooltipText(null)
    setTooltipPos(null)
  }

  const showTooltip = (minutes: number, rect: DOMRect) => {
    setTooltipPos(null)
    setAnchor(rect)
    setTooltipText(`${minutes} min`)
  }

  const showPortal = Boolean(anchor && tooltipText != null)

  return (
    <div className="mx-auto w-96 max-w-full">
      <h2 className="mb-4 text-xl font-semibold">Minutes Listening (last 7 days)</h2>
      <div className="relative flex w-full">
        {/* Y-axis labels */}
        <div className="flex w-8 shrink-0 flex-col pr-1">
          {yTickValues.map((tick) => (
            <div
              key={tick}
              style={{ height: `${lineSpacing}px` }}
              className="flex items-center justify-end text-xs font-semibold text-foreground-muted"
            >
              {tick}
            </div>
          ))}
        </div>

        {/* SVG chart */}
        <div className="min-w-0 flex-1">
          <svg
            role="img"
            aria-label={summaryAriaLabel}
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            className="h-72 w-full max-w-[22.5rem]"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Horizontal grid lines */}
            {Array.from({ length: 7 }, (_, n) => {
              const y = (n + 1) * lineSpacing - lineSpacing / 2
              return <line key={n} x1={0} x2={CHART_WIDTH} y1={y} y2={y} stroke="var(--tc-border)" strokeWidth={1} />
            })}

            {/* Line */}
            <polyline
              fill="none"
              stroke="var(--design-accent)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polylinePointsSvg}
              pointerEvents="none"
            />

            {/* X-axis day labels */}
            {series.map((d, i) => (
              <text
                key={`xlab-${d.dateKey}`}
                x={pointCentersSvg[i]?.x ?? 0}
                y={CHART_X_LABEL_Y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none fill-current text-sm text-foreground"
                fontSize={11}
              >
                {d.weekdayAbbr}
              </text>
            ))}

            {/* Interactive dots */}
            {pointCentersSvg.map((c, i) => {
              const minutes = series[i]?.minutes ?? 0
              const label = `${series[i]?.weekdayAbbr ?? ''} ${minutes} minutes`
              return (
                <g
                  key={series[i]?.dateKey ?? i}
                  transform={`translate(${c.x},${c.y})`}
                  className="group cursor-default"
                  aria-label={label}
                  onMouseEnter={(e) => showTooltip(minutes, e.currentTarget.getBoundingClientRect())}
                  onMouseLeave={hideTooltip}
                  onFocus={(e) => showTooltip(minutes, e.currentTarget.getBoundingClientRect())}
                  onBlur={hideTooltip}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') hideTooltip()
                  }}
                  tabIndex={0}
                >
                  <circle r={14} cx={0} cy={0} fill="transparent" />
                  <g
                    className="transition-transform duration-150 ease-out group-hover:scale-125"
                    style={{ transformBox: 'fill-box', transformOrigin: '0px 0px' }}
                  >
                    <circle
                      r={4}
                      cx={0}
                      cy={0}
                      fill="var(--design-accent)"
                      className="pointer-events-none transition-colors duration-150 group-hover:fill-yellow-300"
                    />
                  </g>
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      {/* Summary stats row */}
      <div className="mt-6 flex flex-wrap justify-between gap-4">
        <StatBox label="Week total" value={model.totalMinutes} sub="minutes" />
        <StatBox label="Daily average" value={model.averageMinutes} sub="minutes" />
        <StatBox label="Best day" value={model.bestDayMinutes} sub="minutes" />
        <StatBox label="Streak" value={model.streakDays} sub="days in a row" />
      </div>

      {/* Portal tooltip */}
      {showPortal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            className="pointer-events-none fixed z-[1000] rounded bg-bg-read-only px-2 py-1 text-xs whitespace-nowrap text-foreground shadow-lg"
            style={{
              left: tooltipPos?.left ?? -9999,
              top: tooltipPos?.top ?? 0,
              visibility: tooltipPos ? 'visible' : 'hidden',
            }}
          >
            {tooltipText}
          </div>,
          document.body
        )}
    </div>
  )
}
