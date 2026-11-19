import type { PlayerQueueItem } from '../contexts/MediaContext'

/**
 * Decide what a `playItem` call does to the queue.
 *
 * `playItem` used to declare `queueItems: PlayerQueueItem[] = []` and call
 * `setPlayerQueueItems(queueItems)` unconditionally, so every call that did not
 * pass a queue replaced the user's queue with an empty one. Three call sites did
 * exactly that — the item detail page, the episode table, and the auto-advance
 * effect in `MediaPlayerContainer` — so a queue built with "Add to queue" was
 * destroyed by the mere act of pressing Play, and the "N / M in queue" indicator
 * vanished the moment playback started.
 *
 * Auto-advance was the worst case, because it also emptied the very queue its own
 * `playerQueueItems.length === 0` guard then used to halt advancement: a queue
 * could never play past a single item.
 *
 * The rule is `undefined` means "leave the queue alone" and an array means "this
 * is the new queue", including an empty one, since clearing deliberately is a real
 * intent (`clearStreamMedia`).
 *
 * This is a separate function rather than an inline `if` so the rule is one named,
 * unit-tested thing. Reverting it to a `= []` default on the parameter is
 * invisible to the type checker — every existing call site still compiles — so
 * without a test that pins this, the regression comes back silently.
 */
export function resolveQueueUpdate(
  current: readonly PlayerQueueItem[],
  queueItems: PlayerQueueItem[] | undefined
): PlayerQueueItem[] {
  return queueItems === undefined ? [...current] : [...queueItems]
}

/**
 * Pure function to reorder items in a queue safely.
 * Returns a new array with the item at `fromIndex` moved to `toIndex`.
 * If either index is out of bounds, returns a copy of the original array.
 */
export function reorderQueue(
  current: readonly PlayerQueueItem[],
  fromIndex: number,
  toIndex: number
): PlayerQueueItem[] {
  if (
    fromIndex < 0 ||
    fromIndex >= current.length ||
    toIndex < 0 ||
    toIndex >= current.length ||
    fromIndex === toIndex
  ) {
    return [...current]
  }

  const updated = [...current]
  const [moved] = updated.splice(fromIndex, 1)
  if (!moved) return [...current]
  updated.splice(toIndex, 0, moved)
  return updated
}

/**
 * Inserts an item into the queue to play next.
 * If the item is already present in the queue, it is moved from its current position
 * to immediately after the current playing item (or to index 0 if no current item is found).
 *
 * @param current - Current queue items
 * @param item - Item to insert to play next
 * @param currentItemId - Optional ID of the currently playing item
 * @param currentEpisodeId - Optional episode ID of currently playing item
 */
export function insertPlayNext(
  current: readonly PlayerQueueItem[],
  item: PlayerQueueItem,
  currentItemId?: string | null,
  currentEpisodeId?: string | null
): PlayerQueueItem[] {
  // First, filter out any existing instance of the item being inserted
  const filtered = current.filter((i) => {
    if (!item.episodeId && !i.episodeId) {
      return i.libraryItemId !== item.libraryItemId
    }
    return !(i.libraryItemId === item.libraryItemId && i.episodeId === item.episodeId)
  })

  // Find where the current playing item is located in the filtered queue
  const currentIndex = currentItemId
    ? filtered.findIndex((i) => {
        if (!currentEpisodeId && !i.episodeId) {
          return i.libraryItemId === currentItemId
        }
        return i.libraryItemId === currentItemId && i.episodeId === currentEpisodeId
      })
    : -1

  // If found, insert immediately after current item; otherwise insert at head
  const insertIndex = currentIndex >= 0 ? currentIndex + 1 : 0
  const result = [...filtered]
  result.splice(insertIndex, 0, item)
  return result
}

/**
 * Calculates aggregate queue metrics: total duration of all items,
 * remaining duration across current and upcoming items, and upcoming item count.
 */
export function calculateQueueMetrics(
  items: readonly PlayerQueueItem[],
  currentItemId?: string | null,
  currentTime = 0
): {
  totalDuration: number
  remainingDuration: number
  upcomingCount: number
} {
  const currentIndex = currentItemId
    ? items.findIndex((i) => i.libraryItemId === currentItemId)
    : -1

  let totalDuration = 0
  let remainingDuration = 0

  items.forEach((item, index) => {
    const dur = item.duration ?? 0
    totalDuration += dur

    if (currentIndex >= 0) {
      if (index === currentIndex) {
        remainingDuration += Math.max(0, dur - currentTime)
      } else if (index > currentIndex) {
        remainingDuration += dur
      }
    } else {
      // If current item not in queue, all items are remaining
      remainingDuration += dur
    }
  })

  const upcomingCount = currentIndex >= 0 ? Math.max(0, items.length - (currentIndex + 1)) : items.length

  return {
    totalDuration,
    remainingDuration,
    upcomingCount,
  }
}


