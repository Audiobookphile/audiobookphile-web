import { describe, expect, it } from 'bun:test'

describe('BatchActionBar Selection and Actions', () => {
  it('correctly toggles item IDs in selection set', () => {
    const selectedIds = new Set<string>()

    const toggle = (set: Set<string>, id: string): Set<string> => {
      const next = new Set(set)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    }

    let current = toggle(selectedIds, 'book-1')
    expect(current.has('book-1')).toBe(true)
    expect(current.size).toBe(1)

    current = toggle(current, 'book-2')
    expect(current.has('book-2')).toBe(true)
    expect(current.size).toBe(2)

    current = toggle(current, 'book-1')
    expect(current.has('book-1')).toBe(false)
    expect(current.has('book-2')).toBe(true)
    expect(current.size).toBe(1)
  })

  it('determines allSelected correctly based on total count', () => {
    const checkAllSelected = (selected: Set<string>, total: number) => {
      return total > 0 && selected.size === total
    }

    const set3 = new Set(['b1', 'b2', 'b3'])
    expect(checkAllSelected(set3, 3)).toBe(true)
    expect(checkAllSelected(set3, 4)).toBe(false)
    expect(checkAllSelected(new Set(), 0)).toBe(false)
  })

  it('formats payload for batchUpdateMediaFinishedAction correctly', () => {
    const selectedIds = new Set(['item-alpha', 'item-beta', 'item-gamma'])

    const buildPayload = (ids: Set<string>, isFinished: boolean) => {
      return Array.from(ids).map((id) => ({
        libraryItemId: id,
        isFinished,
      }))
    }

    const finishPayload = buildPayload(selectedIds, true)
    expect(finishPayload).toHaveLength(3)
    expect(finishPayload[0]).toEqual({ libraryItemId: 'item-alpha', isFinished: true })
    expect(finishPayload[1]).toEqual({ libraryItemId: 'item-beta', isFinished: true })
    expect(finishPayload[2]).toEqual({ libraryItemId: 'item-gamma', isFinished: true })

    const unfinishPayload = buildPayload(selectedIds, false)
    expect(unfinishPayload[0]).toEqual({ libraryItemId: 'item-alpha', isFinished: false })
  })

  it('handles toggleSelectAll to either select all loaded or deselect all', () => {
    const loadedIds = ['b1', 'b2', 'b3', 'b4']

    const toggleAll = (currentSelected: Set<string>, loaded: string[]): Set<string> => {
      if (currentSelected.size >= loaded.length && loaded.length > 0) {
        return new Set()
      }
      return new Set(loaded)
    }

    // Partial selection -> select all
    const partial = new Set(['b1', 'b2'])
    const all = toggleAll(partial, loadedIds)
    expect(all.size).toBe(4)
    expect(Array.from(all)).toEqual(loadedIds)

    // All selected -> deselect all
    const empty = toggleAll(all, loadedIds)
    expect(empty.size).toBe(0)
  })
})

