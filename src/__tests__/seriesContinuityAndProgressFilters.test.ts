import { describe, expect, it } from 'bun:test'
import { QUICK_PROGRESS_FILTERS, resolveSeriesContinuity } from '@/features/library/lib/quickFilters'
import { filterDecode } from '@/shared/lib/filterUtils'

describe('Upstream Features: Series Continuity & Quick Progress Filters', () => {
  describe('QUICK_PROGRESS_FILTERS', () => {
    it('defines the 4 canonical progress filters', () => {
      const ids = QUICK_PROGRESS_FILTERS.map((f) => f.id)
      expect(ids).toEqual(['all', 'in-progress', 'not-started', 'finished'])
    })

    it('encodes filter values correctly with progress prefix and base64', () => {
      const inProgress = QUICK_PROGRESS_FILTERS.find((f) => f.id === 'in-progress')!
      expect(inProgress.filterValue.startsWith('progress.')).toBeTrue()

      const encodedPart = inProgress.filterValue.replace('progress.', '')
      expect(filterDecode(encodedPart)).toBe('in-progress')

      const notStarted = QUICK_PROGRESS_FILTERS.find((f) => f.id === 'not-started')!
      expect(filterDecode(notStarted.filterValue.replace('progress.', ''))).toBe('not-started')

      const finished = QUICK_PROGRESS_FILTERS.find((f) => f.id === 'finished')!
      expect(filterDecode(finished.filterValue.replace('progress.', ''))).toBe('finished')
    })
  })

  describe('Series Continuity Resolution Logic', () => {
    const seriesBooks = [
      { id: 'b1', title: 'The Way of Kings', sequence: '1' },
      { id: 'b2', title: 'Words of Radiance', sequence: '2' },
      { id: 'b3', title: 'Oathbringer', sequence: '3' },
      { id: 'b4', title: 'Rhythm of War', sequence: '4' },
    ]

    it('resolves middle book with both previous and next in series', () => {
      const continuity = resolveSeriesContinuity('b2', seriesBooks)
      expect(continuity.previous?.id).toBe('b1')
      expect(continuity.previous?.title).toBe('The Way of Kings')
      expect(continuity.next?.id).toBe('b3')
      expect(continuity.next?.title).toBe('Oathbringer')
    })

    it('resolves first book in series with no previous and correct next', () => {
      const continuity = resolveSeriesContinuity('b1', seriesBooks)
      expect(continuity.previous).toBeNull()
      expect(continuity.next?.id).toBe('b2')
      expect(continuity.next?.title).toBe('Words of Radiance')
    })

    it('resolves final book in series with previous and no next', () => {
      const continuity = resolveSeriesContinuity('b4', seriesBooks)
      expect(continuity.previous?.id).toBe('b3')
      expect(continuity.next).toBeNull()
    })

    it('returns nulls for book not found in series', () => {
      const continuity = resolveSeriesContinuity('unknown', seriesBooks)
      expect(continuity.previous).toBeNull()
      expect(continuity.next).toBeNull()
    })
  })
})
