import { describe, expect, it } from 'bun:test'
import { isStaleSessionResponse } from '@/features/player/lib/sessionFreshness'

/**
 * Stale playback-session responses must be discarded.
 *
 * `load` is async and opening a session is a network round trip, so two rapid
 * Play presses overlap. The failure, precisely:
 *
 *   1. Play A begins; `libraryItemRef` = A
 *   2. the user presses Play on B; `libraryItemRef` = B
 *   3. A's session response arrives
 *
 * `handleSessionReady` took the item from `libraryItemRef.current` (now B) and the
 * tracks from the response (A's), then called `set(itemB, tracksA)`. The bar showed
 * B's title and cover while playing A's audio, progress synced against B's
 * session, and B's saved position never advanced.
 *
 * The permissive branches are asserted as deliberately, because "discard anything
 * uncertain" is the tempting wrong fix: it would throw away the session the user
 * is actually waiting for whenever the check cannot be made.
 */
describe('isStaleSessionResponse', () => {
  it('flags a response for a different item (the cross-wired race)', () => {
    // A's response arriving after the user moved on to B.
    expect(isStaleSessionResponse('item-a', 'item-b')).toBe(true)
  })

  it('accepts a response for the item now playing', () => {
    expect(isStaleSessionResponse('item-b', 'item-b')).toBe(false)
  })

  it('accepts when the player has been torn down since the request', () => {
    // currentLibraryItemId is null after closePlayer. There is no evidence of
    // staleness, and discarding here would kill legitimate playback.
    expect(isStaleSessionResponse('item-a', null)).toBe(false)
    expect(isStaleSessionResponse('item-a', undefined)).toBe(false)
  })

  it('accepts a session that carries no libraryItemId', () => {
    // Cannot be checked at all. Preferring the playing session over guessing.
    expect(isStaleSessionResponse(undefined, 'item-b')).toBe(false)
    expect(isStaleSessionResponse(null, 'item-b')).toBe(false)
    expect(isStaleSessionResponse('', 'item-b')).toBe(false)
  })

  it('tolerates two presses on the SAME item', () => {
    // Double-tapping Play on one book opens two sessions for it. Neither is
    // stale by this rule; the later response simply wins, which is correct
    // because both describe the same audio.
    expect(isStaleSessionResponse('item-b', 'item-b')).toBe(false)
  })

  it('is symmetric about which side is stale', () => {
    // The guard must not depend on arrival order.
    expect(isStaleSessionResponse('item-a', 'item-b')).toBe(true)
    expect(isStaleSessionResponse('item-b', 'item-a')).toBe(true)
  })
})
