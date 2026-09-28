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
