'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'
import { ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react'
import { mergeClasses } from '@/shared/lib/merge-classes'
import Checkbox from './Checkbox'
import Dropdown from './Dropdown'
import IconBtn from './IconBtn'

/** Tailwind responsive breakpoints */
export type TailwindBreakpoint = 'sm' | 'md' | 'lg'

export interface DataTableColumn<T> {
  /** Header label to display */
  label: ReactNode
  /** Key to access data from row, or render function */
  accessor?: keyof T | ((row: T, index: number) => ReactNode)
  /** Optional key used by sorting state */
  sortKey?: string
  /** Enables sort interaction for this column */
  sortable?: boolean
  /** Optional className for the header cell */
  headerClassName?: string
  /** Optional className for the data cell */
  cellClassName?: string
  /** Optional minimum width of the table (in pixels) required to show this column */
  minTableWidth?: number
  /** Hide column below this breakpoint (e.g., 'md' hides on sm screens) */
  hiddenBelow?: TailwindBreakpoint
}

export interface DataTablePaginationProps {
  /** Current page (1-indexed) */
  currentPage: number
  /** Total number of pages */
  totalPages: number
  /** Number of rows per page */
  rowsPerPage: number
  /** Available options for rows per page */
  rowsPerPageOptions?: number[]
  /** Callback when page changes */
  onPageChange: (page: number) => void
  /** Callback when rows per page changes */
  onRowsPerPageChange: (rowsPerPage: number) => void
  /** Label for rows per page (for i18n) */
  rowsPerPageLabel?: string
  /** Label format for page indicator (for i18n) */
  pageLabel?: string
}

export interface DataTableSelectionProps<T> {
  /** Selected row keys for controlled selection state */
  selectedRowKeys: Array<string | number>
  /** Toggle a single row selection state */
  onToggleRow: (row: T, index: number, selected: boolean) => void
  /** Toggle all visible rows selection state */
  onToggleAllRows: (selected: boolean, rows: T[]) => void
  /** Optional override for selected row detection */
  getIsRowSelected?: (row: T, index: number) => boolean
  /** Optional className for checkbox cells/column */
  checkboxColumnClassName?: string
  /** Hide checkbox column below this breakpoint */
  hideCheckboxBelow?: TailwindBreakpoint
}

export interface DataTableBulkActionsProps {
  /** Optional selected label" */
  selectedLabel?: ReactNode | ((selectedCount: number) => ReactNode)
  /** Actions rendered on the right side of the bulk header */
  actions: ReactNode
  /** Optional className for bulk header */
  className?: string
}

export interface DataTableSortingProps {
  /** Currently active sort key */
  sortBy: string
  /** Sort direction */
  sortDesc: boolean
  /** Callback when a sortable header is clicked */
  onSortChange: (sortBy: string, sortDesc: boolean) => void
}

export interface DataTableProps<T> {
  /** Array of data to display */
  data: T[]
  /** Column definitions */
  columns: DataTableColumn<T>[]
  /** Key extractor for unique row keys */
  getRowKey: (row: T, index: number) => string | number
  /** Optional custom row renderer - if provided, overrides default row rendering */
  renderRow?: (row: T, index: number) => ReactNode
  /** Optional pagination configuration */
  pagination?: DataTablePaginationProps
  /** Optional table caption for accessibility */
  caption?: string
  /** Optional className for the table container */
  className?: string
  /** Optional className for the table element */
  tableClassName?: string
  /** Optional className for rows */
  rowClassName?: string | ((row: T, index: number) => string)
  /** Optional callback when a row is clicked */
  onRowClick?: (row: T, index: number) => void
  /** Optional row selection configuration */
  selection?: DataTableSelectionProps<T>
  /** Optional bulk actions shown in place of header when rows are selected */
  bulkActions?: DataTableBulkActionsProps
  /** Optional sortable columns configuration */
  sorting?: DataTableSortingProps
}

function DataTablePagination({
  currentPage,
  totalPages,
  rowsPerPage,
  rowsPerPageOptions = [10, 25, 50, 100],
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageLabel = 'Rows per page',
  pageLabel,
}: DataTablePaginationProps) {
  const dropdownItems = useMemo(
    () =>
      rowsPerPageOptions.map((opt) => ({
        text: String(opt),
        value: opt,
      })),
    [rowsPerPageOptions]
  )

  const pageIndicator = pageLabel || `Page ${currentPage} of ${totalPages}`

  return (
    <div className="flex items-center justify-end gap-4 rounded-b-xl border-t border-white/5 bg-white/5 px-6 py-4 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold tracking-wider text-foreground/60 uppercase">{rowsPerPageLabel}</span>
        <div className="w-24">
          <Dropdown
            value={rowsPerPage}
            items={dropdownItems}
            onChange={(value) => onRowsPerPageChange(value as number)}
            size="small"
          />
        </div>
      </div>
      <span className="text-sm font-medium text-foreground/80">{pageIndicator}</span>
      <div className="ms-2 flex items-center gap-2">
        <IconBtn
          ariaLabel="Previous page"
          size="small"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft size={16} />
        </IconBtn>
        <IconBtn
          ariaLabel="Next page"
          size="small"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight size={16} />
        </IconBtn>
      </div>
    </div>
  )
}

export default function DataTable<T>({
  data,
  columns,
  getRowKey,
  renderRow,
  pagination,
  caption,
  className,
  tableClassName,
  rowClassName,
  onRowClick,
  selection,
  bulkActions,
  sorting,
}: DataTableProps<T>) {
  const id = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const headerRowRef = useRef<HTMLTableRowElement>(null)
  const [tableWidth, setTableWidth] = useState<number | null>(null)
  const [headerHeight, setHeaderHeight] = useState(44)

  useEffect(() => {
    if (!containerRef.current) return

    const updateWidth = () => {
      if (containerRef.current) {
        setTableWidth(containerRef.current.getBoundingClientRect().width)
      }
    }

    updateWidth()

    const resizeObserver = new ResizeObserver(() => {
      updateWidth()
    })

    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  const visibleColumns = useMemo(() => {
    return columns.filter((col) => {
      if (col.minTableWidth === undefined) return true
      if (tableWidth === null) return true
      return tableWidth >= col.minTableWidth
    })
  }, [columns, tableWidth])

  const getRowClassName = (row: T, index: number): string => {
    const baseClassName = typeof rowClassName === 'function' ? rowClassName(row, index) : rowClassName || ''
    const clickableClassName = onRowClick ? 'cursor-pointer' : ''
    return mergeClasses(baseClassName, clickableClassName)
  }

  const getResponsiveHiddenClass = (breakpoint?: TailwindBreakpoint): string => {
    if (!breakpoint) return ''
    const hiddenClasses: Record<TailwindBreakpoint, string> = {
      sm: 'hidden sm:table-cell',
      md: 'hidden md:table-cell',
      lg: 'hidden lg:table-cell',
    }
    return hiddenClasses[breakpoint]
  }

  const getRowKeyValue = (row: T, index: number): string | number => getRowKey(row, index)

  const selectedRowKeySet = useMemo(() => {
    if (!selection) return new Set<string | number>()
    return new Set(selection.selectedRowKeys)
  }, [selection])

  const isRowSelected = (row: T, index: number): boolean => {
    if (!selection) return false
    if (selection.getIsRowSelected) return selection.getIsRowSelected(row, index)
    return selectedRowKeySet.has(getRowKeyValue(row, index))
  }

  const numSelectedRows = useMemo(() => {
    if (!selection) return 0
    return data.reduce((count, row, index) => {
      const rowSelected = selection.getIsRowSelected
        ? selection.getIsRowSelected(row, index)
        : selectedRowKeySet.has(getRowKey(row, index))
      return rowSelected ? count + 1 : count
    }, 0)
  }, [data, selection, selectedRowKeySet, getRowKey])

  const isAllRowsSelected = data.length > 0 && numSelectedRows === data.length
  const isPartiallySelected = numSelectedRows > 0 && !isAllRowsSelected
  const showBulkHeader = !!selection && !!bulkActions && numSelectedRows > 0

  useEffect(() => {
    if (!headerRowRef.current) return

    const updateHeaderHeight = () => {
      if (headerRowRef.current) {
        setHeaderHeight(headerRowRef.current.getBoundingClientRect().height)
      }
    }

    updateHeaderHeight()

    const resizeObserver = new ResizeObserver(() => {
      updateHeaderHeight()
    })

    resizeObserver.observe(headerRowRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [visibleColumns.length, showBulkHeader])

  const renderCellContent = (row: T, column: DataTableColumn<T>, index: number): ReactNode => {
    if (!column.accessor) {
      return null
    }
    if (typeof column.accessor === 'function') {
      return column.accessor(row, index)
    }
    const value = row[column.accessor]
    if (value === null || value === undefined) {
      return null
    }
    return String(value)
  }

  const renderDefaultRow = (row: T, index: number) => (
    <motion.tr
      layout
      key={getRowKeyValue(row, index)}
      className={mergeClasses(
        'group border-b border-white/5 transition-colors even:bg-white/[0.02] hover:bg-white/[0.05]',
        isRowSelected(row, index) ? 'bg-primary/10 hover:bg-primary/15' : '',
        getRowClassName(row, index)
      )}
      onClick={onRowClick ? () => onRowClick(row, index) : undefined}
    >
      {selection && (
        <td
          className={mergeClasses(
            'h-12 w-14 min-w-[3.5rem] px-0 text-center align-middle',
            getResponsiveHiddenClass(selection.hideCheckboxBelow),
            selection.checkboxColumnClassName
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-center">
            <Checkbox
              value={isRowSelected(row, index)}
              size="small"
              ariaLabel={'Select row'}
              onChange={(nextSelected) => selection.onToggleRow(row, index, nextSelected)}
            />
          </div>
        </td>
      )}
      {visibleColumns.map((column, colIndex) => (
        <td
          key={`${id}-cell-${index}-${colIndex}`}
          className={mergeClasses(
            'text-foreground/80 px-4 py-3 font-medium',
            getResponsiveHiddenClass(column.hiddenBelow),
            column.cellClassName
          )}
        >
          {renderCellContent(row, column, index)}
        </td>
      ))}
    </motion.tr>
  )

  const renderHeaderCell = (column: DataTableColumn<T>, index: number) => {
    const sortKey = column.sortKey || (typeof column.accessor === 'string' ? String(column.accessor) : undefined)
    const isSortable = !!sorting && !!column.sortable && !!sortKey
    const isActiveSort = isSortable && sorting.sortBy === sortKey

    if (!isSortable) {
      return (
        <th
          key={`${id}-header-${index}`}
          className={mergeClasses(
            'text-foreground/40 px-4 py-3 text-start text-xs font-bold tracking-wider uppercase',
            column.headerClassName,
            getResponsiveHiddenClass(column.hiddenBelow)
          )}
          scope="col"
        >
          {column.label}
        </th>
      )
    }

    return (
      <th
        key={`${id}-header-${index}`}
        className={mergeClasses(
          'text-foreground/40 group hover:text-foreground/60 cursor-pointer px-4 py-3 text-start text-xs font-bold tracking-wider uppercase transition-colors select-none',
          column.headerClassName,
          getResponsiveHiddenClass(column.hiddenBelow)
        )}
        scope="col"
        onClick={() => sorting.onSortChange(sortKey, isActiveSort ? !sorting.sortDesc : true)}
      >
        <div className="inline-flex items-center gap-1.5">
          {column.label}
          <div
            className={mergeClasses(
              'transition-all duration-200',
              isActiveSort ? 'text-primary opacity-100' : 'opacity-0 group-hover:opacity-40'
            )}
          >
            {sorting.sortDesc ? <ChevronDown size={14} strokeWidth={3} /> : <ChevronUp size={14} strokeWidth={3} />}
          </div>
        </div>
      </th>
    )
  }

  const bulkSelectedLabel =
    typeof bulkActions?.selectedLabel === 'function'
      ? bulkActions.selectedLabel(numSelectedRows)
      : bulkActions?.selectedLabel || `${numSelectedRows} selected`

  const renderSelectionHeaderCell = () => {
    if (!selection) return null

    return (
      <th
        className={mergeClasses(
          'h-12 w-14 min-w-[3.5rem] px-0 text-center align-middle',
          getResponsiveHiddenClass(selection.hideCheckboxBelow),
          selection.checkboxColumnClassName
        )}
        onClick={(e) => e.stopPropagation()}
        scope="col"
      >
        <div className="flex items-center justify-center">
          <Checkbox
            value={isAllRowsSelected}
            partial={isPartiallySelected}
            size="small"
            ariaLabel={'Select all rows'}
            onChange={(selected) => selection.onToggleAllRows(selected, data)}
          />
        </div>
      </th>
    )
  }

  return (
    <div ref={containerRef} className={mergeClasses('group/table w-full', className)}>
      <div className="relative overflow-x-auto rounded-2xl border border-white/10 bg-primary/5 shadow-xl">
        <table className={mergeClasses('w-full border-collapse text-sm', tableClassName)}>
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="sticky top-0 z-10 bg-white/5 backdrop-blur-md">
            <tr ref={headerRowRef} className="border-b border-white/10">
              {renderSelectionHeaderCell()}
              {visibleColumns.map((column, index) => renderHeaderCell(column, index))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.map((row, index) => (renderRow ? renderRow(row, index) : renderDefaultRow(row, index)))}
          </tbody>
        </table>

        <AnimatePresence>
          {showBulkHeader && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute inset-x-0 top-0 z-20 flex items-center border-b border-white/20 bg-primary shadow-lg"
              style={{ height: `${headerHeight}px` }}
            >
              <div className={mergeClasses('flex h-full w-full items-center', bulkActions?.className)}>
                {selection && (
                  <div
                    className={mergeClasses(
                      'h-full w-14 min-w-[3.5rem] px-0 text-center align-middle',
                      getResponsiveHiddenClass(selection.hideCheckboxBelow),
                      selection.checkboxColumnClassName
                    )}
                  >
                    <div className="flex h-full items-center justify-center">
                      <Checkbox
                        value={isAllRowsSelected}
                        partial={isPartiallySelected}
                        size="small"
                        ariaLabel={'Select all rows'}
                        onChange={(selected) => selection.onToggleAllRows(selected, data)}
                      />
                    </div>
                  </div>
                )}
                <div className="flex min-h-0 min-w-0 flex-1 items-center justify-between gap-4 px-4">
                  <span className="text-sm font-bold text-white">{bulkSelectedLabel}</span>
                  <div className="flex shrink-0 items-center gap-2">{bulkActions?.actions}</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {pagination && <DataTablePagination {...pagination} />}
    </div>
  )
}
