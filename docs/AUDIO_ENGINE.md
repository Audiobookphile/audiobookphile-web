# Audio Engine & Streaming Architecture

The Audiobookphile web client features a continuous, resilient streaming audio engine built on modern Web APIs.

---

## 1. Core Playback Lifecycle

```
  User Selects Book
         │
         ▼
  POST /api/playback/start ─────► Backend verifies auth & creates playback session
         │
         ▼
  Receives Session Payload
  - streamUrl (Presigned B2 or Supabase URL)
  - currentPosition (Restored from previous progress)
  - chapters & duration
         │
         ▼
  Initialize HTML5 Audio
  - Attach Range Request headers for byte-seeking
  - Configure MediaSession metadata
  - Start periodic sync timer (every 10s or on chapter boundary)
```

---

## 2. Queue Contracts (`resolveQueueUpdate`)

The playback queue handles user additions, multi-disc tracks, and automatic track advancement without memory leaks or race conditions:

- **Invariant 1 (Survival on Auto-Advance)**:
  When an audiobook track finishes and triggers `auto-advance`, `resolveQueueUpdate(currentQueue, undefined)` preserves the remaining queue intact.
- **Invariant 2 (No Reference Aliasing)**:
  Queue resolution always returns a new array reference, preventing unintended shared-mutation bugs across components.
- **Invariant 3 (Explicit Clear)**:
  Passing an empty array `[]` explicitly clears the active queue.

---

## 3. MediaSession API Integration

The audio engine synchronizes with the operating system's native media center via `navigator.mediaSession`:

```typescript
if ('mediaSession' in navigator) {
  navigator.mediaSession.metadata = new MediaMetadata({
    title: book.title,
    artist: book.author || book.narrator,
    album: book.seriesName || book.title,
    artwork: [
      { src: coverUrl, sizes: '512x512', type: 'image/jpeg' },
    ],
  });

  navigator.mediaSession.setActionHandler('play', () => audioStore.play());
  navigator.mediaSession.setActionHandler('pause', () => audioStore.pause());
  navigator.mediaSession.setActionHandler('seekto', (details) => {
    if (details.seekTime !== undefined) audioStore.seek(details.seekTime);
  });
  navigator.mediaSession.setActionHandler('seekforward', (details) => {
    audioStore.skipForward(details.seekOffset || 15);
  });
  navigator.mediaSession.setActionHandler('seekbackward', (details) => {
    audioStore.skipBackward(details.seekOffset || 15);
  });
}
```

---

## 4. Race Prevention & Session Freshness

When switching between books rapidly, in-flight progress synchronization requests for previous titles can arrive out of order.

The `isStaleSessionResponse` utility checks incoming response IDs against the currently playing item. Any response belonging to an older session is silently ignored, preventing playback state cross-wiring.
