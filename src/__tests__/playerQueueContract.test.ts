import { describe, expect, it } from 'bun:test'
import { resolveQueueUpdate } from '@/features/player/lib/queue'
import type { PlayerQueueItem } from '@/features/player/contexts/MediaContext'

/**
 * Queue-preservation contract, exercised against the real function.
 *
 * The bug: `playItem` took `queueItems: PlayerQueueItem[] = []` and called
 * `setPlayerQueueItems(queueItems)` unconditionally, so every call that did not
 * pass a queue replaced the user's queue with an empty one. Three call sites did
 * exactly that — the item detail page, the episode table, and the auto-advance
 * effect — so a queue built with "Add to queue" was destroyed by the mere act of
 * pressing Play, and the "N / M in queue" indicator disappeared as playback
 * started. Auto-advance was the worst case: it emptied the very queue its own
 * `length === 0` guard then used to halt advancement, so a queue could never
 * play past one item.
 *
 * Reverting the fix is invisible to the type checker, which is why the rule lives
 * in a tested function instead of an inline `if`.
 */
function entry(libraryItemId: string): PlayerQueueItem {
  return {
    libraryItemId,
    libraryId: 'lib-1',
    episodeId: null,
    title: `Title ${libraryItemId}`,
    subtitle: '',
    caption: '',
    duration: null,
    coverPath: null,
  }
}

describe('resolveQueueUpdate', () => {
  it('leaves an existing queue alone when no queue is supplied', () => {
    const built = [entry('item-1'), entry('item-2'), entry('item-3')]
    expect(resolveQueueUpdate(built, undefined)).toEqual(built)
  })

  it('replaces the queue when one IS supplied', () => {
    // A fresh play from the item page is a deliberate new queue.
    expect(resolveQueueUpdate([entry('a'), entry('b')], [entry('solo')])).toEqual([entry('solo')])
  })

  it('treats an explicit empty array as "clear the queue"', () => {
    // clearStreamMedia uses this, and it must not be confused with "no opinion".
    expect(resolveQueueUpdate([entry('a'), entry('b')], [])).toEqual([])
  })

  it('survives auto-advance: no argument keeps the queue intact', () => {
    // The exact call MediaPlayerContainer makes when the next item finishes.
    // Before the fix this resolved to [] and killed the queue mid-playback.
    const queue = [entry('item-1'), entry('item-2'), entry('item-3')]
    const afterAdvance = resolveQueueUpdate(queue, undefined)

    expect(afterAdvance).toHaveLength(3)
    // The container's own halt condition: a zero-length queue stops advancement.
    expect(afterAdvance.length === 0).toBe(false)
    // And the next item is still findable, so advancement can continue.
    expect(afterAdvance[afterAdvance.findIndex((q) => q.libraryItemId === 'item-1') + 1]).toEqual(entry('item-2'))
  })

  it('does not alias the caller array (no shared-mutation footgun)', () => {
    const queue = [entry('a')]
    const result = resolveQueueUpdate(queue, undefined)
    expect(result).not.toBe(queue)
  })
})
