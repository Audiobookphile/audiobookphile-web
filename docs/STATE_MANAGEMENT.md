# State Management & Data Flow

Audiobookphile uses a hybrid state management model balancing server-rendered data with fast client-side reactivity.

---

## 1. State Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                   Server Component Tree                     │
│  - Data loaded via `apiFetch` (RSC)                         │
│  - No client-side bundle impact                             │
│  - Renders HTML directly to stream                          │
└──────────────────────────────┬──────────────────────────────┘
                               │ Serialized initial props
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Client State Stores                       │
│  - Audio Player Store (Playback state, time, rate, queue)   │
│  - Auth Store (User identity, session JWT, refresh tokens)  │
│  - UI Store (Theme, sidebar open/closed, modal states)      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Authenticated Fetching (`apiFetch`)

All data fetching on the server and in Server Actions routes through `apiFetch`:

```typescript
import { apiFetch } from '@/shared/lib/api/client';

const result = await apiFetch<BookDetails>(`/items/${bookId}`);
if (!result.ok) {
  // Handled cleanly without uncaught exceptions
  return <ErrorState message={result.error.message} />;
}

return <BookView book={result.data} />;
```

### Automatic 401 Recovery
When `apiFetch` receives a `401 Unauthorized` response:
1. It inspects the `refresh_token` cookie.
2. It exchanges the refresh token with Supabase Auth for a new access token.
3. It updates Next.js cookie jars transparently.
4. It retries the original request once before failing.

---

## 3. Multi-Tab Synchronization

Audiobook playback state synchronizes across browser tabs using the `BroadcastChannel` API:
- When a user starts playback in Tab B, Tab A pauses immediately to prevent dual audio playback.
- Progress updates are broadcast so all tabs display identical elapsed timestamps.

