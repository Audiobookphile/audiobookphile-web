import { filterEncode } from '@/shared/lib/filterUtils'

export interface QuickProgressFilter {
  id: 'all' | 'in-progress' | 'not-started' | 'finished'
  label: string
  filterValue: string
}

export const QUICK_PROGRESS_FILTERS: readonly QuickProgressFilter[] = [
  { id: 'all', label: 'All', filterValue: 'all' },
  { id: 'in-progress', label: 'In Progress', filterValue: `progress.${filterEncode('in-progress')}` },
  { id: 'not-started', label: 'Not Started', filterValue: `progress.${filterEncode('not-started')}` },
  { id: 'finished', label: 'Finished', filterValue: `progress.${filterEncode('finished')}` },
] as const

export function resolveSeriesContinuity<T extends { id: string }>(
  currentBookId: string,
  books: T[]
): { previous: T | null; next: T | null } {
  const idx = books.findIndex((b) => b.id === currentBookId)
  if (idx === -1) return { previous: null, next: null }
  return {
    previous: idx > 0 ? books[idx - 1] : null,
    next: idx + 1 < books.length ? books[idx + 1] : null,
  }
}

