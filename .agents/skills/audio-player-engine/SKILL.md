---
name: audio-player-engine
description: Rules and architectural specifications for the Audiobookphile Web Audio playback engine, media sessions, and queue contracts.
---

# Audio Player Engine (Audiobookphile Web)

The audio player engine is the core streaming runtime of `audiobookphile-web`.

## Key Invariants

1. **Queue Preservation & Contracts**:
   - `resolveQueueUpdate(currentQueue, update)`:
     - An auto-advance MUST NOT drop the existing queue.
     - Passing an undefined queue update preserves the current queue.
     - Passing an explicit empty array `[]` clears the queue.
     - Returns a fresh array copy (never aliases caller references).
2. **Media Session Synchronization (`navigator.mediaSession`)**:
   - Update metadata on track change: `title`, `artist` (author/narrator), `album` (series/title), and `artwork`.
   - Wire action handlers: `play`, `pause`, `seekto`, `seekbackward`, `seekforward`, `previoustrack`, `nexttrack`.
3. **Session Freshness & Race Prevention**:
   - When switching books quickly, in-flight progress responses for old items are flagged as stale using `isStaleSessionResponse(activeItemId, responseItemId)` to prevent state cross-wiring.
4. **Cover Art Cache-Busting**:
   - Audio cover URLs route through `/api/items/:id/cover`.
   - Stable cache-busting uses `updatedAt` timestamps (never `Date.now()`) to ensure reliable browser caching while avoiding stale images.

