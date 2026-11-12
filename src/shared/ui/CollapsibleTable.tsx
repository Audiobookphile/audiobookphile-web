import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { ReactNode, useCallback, useId, useMemo } from 'react'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { mergeClasses } from '@/shared/lib/merge-classes'

interface TableHeader {
  label: ReactNode
  className?: string
  scope?: string
}

interface CollapsibleTableProps {
  title: string
  count: number
  expanded?: boolean
  onExpandedChange: (expanded: boolean) => void
  keepOpen?: boolean
  headerActions?: ReactNode
  tableHeaders: TableHeader[]
  tableClassName?: string
  containerRef?: React.RefObject<HTMLDivElement | null>
  children: ReactNode
}

export default function CollapsibleTable({
  title,
  count,
  expanded = false,
  onExpandedChange,
  keepOpen = false,
  headerActions,
  tableHeaders,
  tableClassName,
  containerRef,
  children,
}: CollapsibleTableProps) {
  const t = useTypeSafeTranslations()
  const id = useId()

  const handleClickBar = useCallback(() => {
    if (!keepOpen) {
      onExpandedChange(!expanded)
    }
  }, [keepOpen, expanded, onExpandedChange])

  const isExpanded = keepOpen || expanded
  const hasHeaderActions = Boolean(headerActions)
  const countAriaLabel = useMemo(() => t('LabelItemsPlural', { count }), [count, t])

  return (
    <div className="my-4 w-full overflow-hidden rounded-2xl border border-white/10 bg-primary/5 shadow-lg">
      <div className="flex w-full items-center gap-4 bg-white/5 px-6 py-4 backdrop-blur-md transition-colors">
        {keepOpen ? (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="truncate text-sm font-bold tracking-wider text-foreground/80 uppercase">{title}</span>
            <span
              className="flex h-6 w-8 items-center justify-center rounded-full bg-primary/20 text-[10px] font-black text-primary shadow-inner"
              aria-label={countAriaLabel}
            >
              {count}
            </span>
          </div>
        ) : (
          <button
            type="button"
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-start hover:bg-white/10"
            onClick={handleClickBar}
            aria-expanded={isExpanded}
            aria-controls={`${id}-content`}
          >
            <span className="truncate text-sm font-bold tracking-wider text-foreground/80 uppercase">{title}</span>
            <span
              className="flex h-6 w-8 items-center justify-center rounded-full bg-primary/20 text-[10px] font-black text-primary shadow-inner"
              aria-label={countAriaLabel}
            >
              {count}
            </span>
            <span className="grow" />
            <motion.span
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="text-foreground/40"
            >
              <ChevronDown size={20} strokeWidth={3} aria-hidden="true" />
            </motion.span>
          </button>
        )}

        {hasHeaderActions && <div className="flex flex-shrink-0 items-center gap-2">{headerActions}</div>}
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          >
            <section ref={containerRef} id={`${id}-content`} aria-label={title} className="p-4 pt-0">
              <div className="overflow-x-auto">
                <table className={mergeClasses('w-full border-collapse text-sm', tableClassName)}>
                  <caption className="sr-only">{title}</caption>
                  <thead>
                    <tr className="border-b border-white/5">
                      {tableHeaders.map((header, index) => (
                        <th
                          key={index}
                          className={mergeClasses(
                            'text-foreground/30 py-3 text-start text-[10px] font-black tracking-widest uppercase',
                            header.className
                          )}
                          scope={header.scope ?? 'col'}
                        >
                          {header.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">{children}</tbody>
                </table>
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
