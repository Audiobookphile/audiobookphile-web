---
name: nextjs-app-router
description: Guidelines for Next.js 16 App Router architecture, Server Actions, streaming, and API proxy routing in audiobookphile-web.
---

# Next.js App Router Architecture (Audiobookphile Web)

## Architecture Overview

1. **Server-First Execution**:
   - Server Components (`RSC`) are the default for page shells, data loading, and metadata generation.
   - Client Components (`'use client'`) are strictly leaf nodes handling UI interactivity (e.g. playback controls, forms, theme toggles).

2. **API Proxy Route (`/api/*`)**:
   - `next.config.ts` rewrites incoming client requests from `/api/:path*` directly to the backend Supabase Edge API (`${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/api/:path*`).
   - Browser code and client actions fetch via `/api/...`, preventing CORS issues and centralizing auth headers.

3. **Data Fetching via `apiFetch`**:
   - Server-side data fetching MUST use `apiFetch` from `@/shared/lib/api/client`:
     ```typescript
     const result = await apiFetch<LibraryItem>(`/items/${id}`);
     if (!result.ok) {
       // Graceful fallback or error boundary
     }
     ```
   - `apiFetch` never throws; it returns `{ ok: true, data }` or `{ ok: false, error }`.

4. **Server Actions with Optimistic UI**:
   - Form submissions, bookmarks, and shelf additions use React 19 Server Actions (`'use server'`).
   - Coordinate client state updates with `useOptimistic` for instant feedback.

