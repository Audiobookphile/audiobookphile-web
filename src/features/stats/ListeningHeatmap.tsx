'use client'

import { format } from 'date-fns'
import { type ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  buildListeningHeatmapModel,
  computeWeeksToShow,
  HEATMAP_BLOCK_PX,
  HEATMAP_INTENSITY_LEVELS,
  type HeatmapCellModel,
} from './statsModel'

const HEATMAP_ROWS = 7 // Sun–Sat
const HEATMAP_INNER_HEIGHT = HEATMAP_ROWS * HEATMAP_BLOCK_PX

interface ListeningHeatmapProps {
  daysListening: Record<string, number>
}

export default function ListeningHeatmap({ daysListening }: ListeningHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [contentWidth, setContentWidth] = useState<number | null>(null)
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const [tooltipContent, setTooltipContent] = useState<ReactNode>(null)
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number } | null>(null)

  // Responsive width measurement
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      if (w > 0) setContentWidth(w)
    }
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0
      if (w > 0) setContentWidth(w)
    })
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  }, [])

  const heatmapLayout = useMemo(() => {
    if (contentWidth == null || contentWidth <= 0) return null
    const weeksToShow = computeWeeksToShow(contentWidth)
    const model = buildListeningHeatmapModel(daysListening, weeksToShow)
    return model
  }, [contentWidth, daysListening])

  // Day labels: Mon / Wed / Fri on the left side
  const dayLabels = useMemo(
    () => [
      { label: format(new Date(2023, 0, 2), 'EEE'), row: 1 }, // Mon
      { label: format(new Date(2023, 0, 4), 'EEE'), row: 3 }, // Wed
      { label: format(new Date(2023, 0, 6), 'EEE'), row: 5 }, // Fri
    ],
    []
  )

  // Tooltip positioning
  useLayoutEffect(() => {
    if (!anchor || tooltipContent == null || !tooltipRef.current) {
      setTooltipPos(null)
      return
    }
    const el = tooltipRef.current
    const tw = el.offsetWidth
    const th = el.offsetHeight
    let left = anchor.left + anchor.width / 2 - tw / 2
    if (left < 10) left = 10
    else if (left + tw > window.innerWidth - 10) left = window.innerWidth - 10 - tw
    setTooltipPos({ left, top: anchor.top - th - 6 })
  }, [anchor, tooltipContent])

  const hideTooltip = () => {
    setAnchor(null)
    setTooltipContent(null)
    setTooltipPos(null)
  }

  const openTooltip = (cell: HeatmapCellModel, rect: DOMRect) => {
    const content =
      cell.value > 0 ? (
        <span>
          <strong>{cell.value} min</strong> on {cell.datePretty}
        </span>
      ) : (
        <span>No listening on {cell.datePretty}</span>
      )
    setTooltipPos(null)
    setAnchor(rect)
    setTooltipContent(content)
  }

  const ariaLabel = (cell: HeatmapCellModel) =>
    cell.value > 0 ? `${cell.value} minutes on ${cell.datePretty}` : `No listening on ${cell.datePretty}`

  const showPortal = Boolean(heatmapLayout && anchor && tooltipContent != null)
  const outerHeight = HEATMAP_INNER_HEIGHT + 80 // inner + month labels + legend

  return (
    <div ref={containerRef} className="w-full">
      {!heatmapLayout ? (
        <div className="w-full" style={{ minHeight: outerHeight + 40 }} aria-busy="true" />
      ) : (
        <>
          <div className="mx-auto overflow-x-auto" style={{ maxWidth: heatmapLayout.innerWidthPx + 52 }}>
            <p className="mb-2 px-1 text-sm text-foreground-muted">
              {heatmapLayout.daysListenedInTheLastYear} days with listening in the last year
            </p>

            <div
              className="relative w-full rounded border border-border bg-read-only py-3"
              style={{ height: outerHeight }}
            >
              <div
                className="absolute mt-5 ml-10"
                style={{ width: heatmapLayout.innerWidthPx, height: HEATMAP_INNER_HEIGHT }}
                onMouseLeave={hideTooltip}
              >
                {/* Day-of-week labels */}
                {dayLabels.map((d) => (
                  <div
                    key={d.label}
                    className="absolute top-0 left-0 text-[10px] leading-[10px] text-foreground-muted"
                    style={{
                      transform: `translate(${-28}px, ${d.row * HEATMAP_BLOCK_PX}px)`,
                    }}
                  >
                    {d.label}
                  </div>
                ))}

                {/* Month labels */}
                {heatmapLayout.monthLabels.map((m) => (
                  <div
                    key={m.id}
                    className="absolute top-0 left-0 text-[10px] leading-[10px] text-foreground-muted"
                    style={{
                      transform: `translate(${m.col * HEATMAP_BLOCK_PX}px, -14px)`,
                    }}
                  >
                    {m.label}
                  </div>
                ))}

                {/* Cells */}
                {heatmapLayout.cells.map((cell) => (
                  <button
                    key={cell.dateString}
                    type="button"
                    aria-label={ariaLabel(cell)}
                    data-intensity={cell.intensity}
                    className="stats-heatmap-cell"
                    style={{
                      transform: `translate(${cell.col * HEATMAP_BLOCK_PX}px, ${cell.row * HEATMAP_BLOCK_PX}px)`,
                    }}
                    onMouseEnter={(e) => openTooltip(cell, e.currentTarget.getBoundingClientRect())}
                    onFocus={(e) => openTooltip(cell, e.currentTarget.getBoundingClientRect())}
                    onBlur={hideTooltip}
                  />
                ))}

                {/* Legend */}
                <div className="flex items-center px-1" style={{ marginTop: HEATMAP_INNER_HEIGHT + 12 }}>
                  <div className="grow" />
                  <span className="px-1 text-[10px] text-foreground-muted">Less</span>
                  {HEATMAP_INTENSITY_LEVELS.map((level) => (
                    <div
                      key={level}
                      data-intensity={level}
                      className="stats-heatmap-swatch mx-[1.5px] h-2.5 w-2.5 shrink-0 rounded-sm"
                      aria-hidden
                    />
                  ))}
                  <span className="px-1 text-[10px] text-foreground-muted">More</span>
                </div>
              </div>
            </div>
          </div>

          {showPortal &&
            typeof document !== 'undefined' &&
            createPortal(
              <div
                ref={tooltipRef}
                role="tooltip"
                className="pointer-events-none fixed z-[1000] max-w-xs rounded bg-bg-read-only px-2 py-1 text-[10px] text-foreground shadow-lg"
                style={{
                  left: tooltipPos?.left ?? -9999,
                  top: tooltipPos?.top ?? 0,
                  visibility: tooltipPos ? 'visible' : 'hidden',
                }}
              >
                {tooltipContent}
              </div>,
              document.body
            )}
        </>
      )}
    </div>
  )
}
