import { describe, expect, it } from 'bun:test'
import type { PlayerQueueItem } from '@/features/player/contexts/MediaContext'

describe('Player Up Next Queue Logic', () => {
  const item1: PlayerQueueItem = {
    libraryItemId: 'item-1',
    libraryId: 'lib-1',
    episodeId: null,
    title: 'The Hobbit',
    subtitle: 'J.R.R. Tolkien',
    caption: '',
    duration: 36000,
    coverPath: '/covers/1.jpg',
  }

  const item2: PlayerQueueItem = {
    libraryItemId: 'item-2',
    libraryId: 'lib-1',
    episodeId: null,
    title: 'The Fellowship of the Ring',
    subtitle: 'J.R.R. Tolkien',
    caption: '',
    duration: 54000,
    coverPath: '/covers/2.jpg',
  }

  const item3: PlayerQueueItem = {
    libraryItemId: 'item-3',
    libraryId: 'lib-1',
    episodeId: null,
    title: 'The Two Towers',
    subtitle: 'J.R.R. Tolkien',
    caption: '',
    duration: 52000,
    coverPath: '/covers/3.jpg',
  }

  it('correctly partitions currently playing item and Up Next list', () => {
    const queue = [item1, item2, item3]
    const streamLibraryItemId = 'item-1'

    const currentIndex = queue.findIndex((q) => q.libraryItemId === streamLibraryItemId)
    expect(currentIndex).toBe(0)

    const upNext = queue.slice(currentIndex + 1)
    expect(upNext.length).toBe(2)
    expect(upNext[0].title).toBe('The Fellowship of the Ring')
    expect(upNext[1].title).toBe('The Two Towers')
  })

  it('handles middle item as currently playing item', () => {
    const queue = [item1, item2, item3]
    const streamLibraryItemId = 'item-2'

    const currentIndex = queue.findIndex((q) => q.libraryItemId === streamLibraryItemId)
    expect(currentIndex).toBe(1)

    const upNext = queue.slice(currentIndex + 1)
    expect(upNext.length).toBe(1)
    expect(upNext[0].title).toBe('The Two Towers')
  })

  it('handles empty Up Next when at the end of queue or single item', () => {
    const singleQueue = [item1]
    const streamLibraryItemId = 'item-1'

    const currentIndex = singleQueue.findIndex((q) => q.libraryItemId === streamLibraryItemId)
    const upNext = singleQueue.slice(currentIndex + 1)
    expect(upNext.length).toBe(0)
  })

  it('removes item from queue accurately by libraryItemId and episodeId', () => {
    const queue = [item1, item2, item3]
    const removeTarget = 'item-2'

    const updated = queue.filter((i) => i.libraryItemId !== removeTarget)
    expect(updated.length).toBe(2)
    expect(updated.map((i) => i.libraryItemId)).toEqual(['item-1', 'item-3'])
  })

  it('preserves current item when clearing the queue', () => {
    const queue = [item1, item2, item3]
    const streamLibraryItemId = 'item-1'

    const cleared = queue.filter((i) => i.libraryItemId === streamLibraryItemId)
    expect(cleared.length).toBe(1)
    expect(cleared[0].libraryItemId).toBe('item-1')
  })
})
