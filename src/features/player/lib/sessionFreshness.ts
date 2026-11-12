/**
 * Whether a playback session response is still relevant.
 *
 * `load` is async and opening a session is a network round trip, so two rapid
 * Play presses can be in flight simultaneously. The failure this prevents:
 *
 *   1. Play A begins; `libraryItemRef` = A
 *   2. the user presses Play on B; `libraryItemRef` = B
 *   3. A's session response arrives
 *
 * `handleSessionReady` takes the *item* from `libraryItemRef.current` (now B) and
 * the *tracks* from the response (A's), then calls `set(itemB, tracksA)`. The bar
 * shows B's title and cover while playing A's audio, progress syncs against B, and
 * B's saved position never advances.
 *
 * The session carries the `libraryItemId` it was opened for, so the mismatch is
 * detectable without threading a generation counter through every layer — and it
 * states a domain truth rather than a heuristic. Applying a session for an item
 * that is no longer the one being played is never correct.
 *
 * The two permissive branches are deliberate. An absent item means playback has
 * been torn down since the request went out, and a session with no
 * `libraryItemId` cannot be checked at all; in both cases there is no evidence of
 * staleness, so guessing would risk discarding the session the user is actually
 * waiting for. When in doubt, prefer the session that is already playing.
 */
export function isStaleSessionResponse(
  sessionLibraryItemId: string | null | undefined,
  currentLibraryItemId: string | null | undefined
): boolean {
  if (!sessionLibraryItemId || !currentLibraryItemId) return false
  return sessionLibraryItemId !== currentLibraryItemId
}
