import { describe, expect, it } from 'bun:test'
import type { PlayerQueueItem } from '@/features/player/contexts/MediaContext'
import { calculateQueueMetrics, insertPlayNext } from '@/features/player/lib/queue'
import { formatDurationHuman } from '@/shared/lib/datefns'

function makeItem(id: string, duration: number | null = 3600): PlayerQueueItem {
  return {
    libraryItemId: id,
    libraryId: 'lib-1',
    episodeId: null,
    title: `Book ${id}`,
    subtitle: 'Author',
    caption: '',
    duration,
    coverPath: null,
  }
}

describe('insertPlayNext', () => {
  it('inserts immediately after current playing item', () => {
    const item1 = makeItem('item-1')
    const item2 = makeItem('item-2')
    const item3 = makeItem('item-3')
    const newItem = makeItem('item-next')

    const initialQueue = [item1, item2, item3]
    const updated = insertPlayNext(initialQueue, newItem, 'item-1')

    expect(updated.map((i) => i.libraryItemId)).toEqual(['item-1', 'item-next', 'item-2', 'item-3'])
  })

  it('inserts at index 0 when current item is not found or null', () => {
    const item1 = makeItem('item-1')
    const item2 = makeItem('item-2')
    const newItem = makeItem('item-next')

    const initialQueue = [item1, item2]
    const updated = insertPlayNext(initialQueue, newItem, null)

    expect(updated.map((i) => i.libraryItemId)).toEqual(['item-next', 'item-1', 'item-2'])
  })

  it('moves an existing queued item to play next without duplicating it', () => {
    const item1 = makeItem('item-1')
    const item2 = makeItem('item-2')
    const item3 = makeItem('item-3') // Currently at end of queue

    const initialQueue = [item1, item2, item3]
    const updated = insertPlayNext(initialQueue, item3, 'item-1')

    expect(updated.length).toBe(3)
    expect(updated.map((i) => i.libraryItemId)).toEqual(['item-1', 'item-3', 'item-2'])
  })

  it('handles empty queue cleanly', () => {
    const newItem = makeItem('item-next')
    const updated = insertPlayNext([], newItem, 'item-none')

    expect(updated.length).toBe(1)
    expect(updated[0].libraryItemId).toBe('item-next')
  })
})

describe('calculateQueueMetrics', () => {
  it('calculates total duration and remaining duration accurately', () => {
    const item1 = makeItem('item-1', 3600) // 1h
    const item2 = makeItem('item-2', 7200) // 2h
    const item3 = makeItem('item-3', 1800) // 30m

    const queue = [item1, item2, item3]
    // Currently 1800s (30m) into item-1
    const metrics = calculateQueueMetrics(queue, 'item-1', 1800)

    expect(metrics.totalDuration).toBe(12600) // 3.5h
    // Remaining in item-1: 1800s + item-2: 7200s + item-3: 1800s = 10800s (3h)
    expect(metrics.remainingDuration).toBe(10800)
    expect(metrics.upcomingCount).toBe(2)
  })

  it('handles queue with null durations gracefully', () => {
    const item1 = makeItem('item-1', null)
    const item2 = makeItem('item-2', 3600)

    const queue = [item1, item2]
    const metrics = calculateQueueMetrics(queue, 'item-1', 0)

    expect(metrics.totalDuration).toBe(3600)
    expect(metrics.remainingDuration).toBe(3600)
  })
})

describe('formatDurationHuman', () => {
  it('formats hours and minutes properly', () => {
    expect(formatDurationHuman(3660)).toBe('1h 1m')
    expect(formatDurationHuman(7200)).toBe('2h 0m')
    expect(formatDurationHuman(1500)).toBe('25m')
    expect(formatDurationHuman(45)).toBe('45s')
    expect(formatDurationHuman(0)).toBe('0m')
  })
})
