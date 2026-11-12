# Web Client Architecture

The Audiobookphile web client is built on **Next.js 16** using the App Router, React 19 Server Components, and the Bun runtime.

```
                          ┌───────────────────────────┐
                          │   Browser Client (User)   │
                          └─────────────┬─────────────┘
                                        │
                         HTTP / REST    │  Audio Streams (Range Requests)
                                        ▼
                          ┌───────────────────────────┐
                          │     Next.js 16 Web App    │
                          │   - React 19 RSC & RCC    │
                          │   - /api/* Rewrite Proxy  │
                          │   - Liquid Glass UI       │
                          └─────────────┬─────────────┘
                                        │
                                        │ Internal Proxy Rewrite
                                        ▼
                          ┌───────────────────────────┐
                          │  Supabase Edge Functions  │
                          │       (Deno + Hono)       │
                          └─────────────┬─────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
              ┌────────────────────┐        ┌────────────────────┐
              │ PostgreSQL Database│        │ Backblaze B2 (S3)  │
              │  (RLS + pgvector)  │        │ (Presigned Audio)  │
              └────────────────────┘        └────────────────────┘
```

---

## 1. Directory Structure

The application follows a modular, feature-based architecture:

```
src/
├── app/                  # Next.js App Router routes
│   ├── (auth)/           # Authentication routes (/login, /signup, /auth/confirm)
│   ├── (main)/           # Authenticated application shell (/library, /books, /settings)
│   ├── (public)/         # Public landing, legal, and support pages (/privacy, /support)
│   └── setup/            # First-Time Setup Wizard for fresh Supabase instances
├── entities/             # Domain entities (User, Book, Author, Series, Collection)
├── features/             # Interactive user workflows (Auth, AudioPlayer, Search, Shelves)
├── shared/               # Shared utilities, API client, design tokens, and components
│   ├── lib/api/          # Unified non-throwing fetch layer (`apiFetch`)
│   ├── ui/               # Liquid Glass UI primitives
│   └── utils/            # Supabase SSR and environment helpers
└── types/                # Canonical TypeScript declarations & Supabase generated types
```

---

## 2. Server Components vs Client Components

- **React Server Components (RSC)**:
  - Default for all page roots and data-fetching shells.
  - Render securely on the server with zero client bundle overhead.
  - Fetch data via `apiFetch` using the server's environment.
- **Client Components (`'use client'`)**:
  - Confined to the interactive edges of the component tree:
    - Audio player controls & scrubbers
    - Filter overlays and dropdowns
    - Form interactions and client-side validations

---

## 3. Reverse Proxy Routing (`/api/*`)

To eliminate cross-origin resource sharing (CORS) friction and prevent leaking raw backend URLs into client JavaScript, `next.config.ts` transparently proxies all `/api/:path*` requests to the Supabase Edge API:

```typescript
// next.config.ts
async rewrites() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return [
    {
      source: '/api/:path*',
      destination: `${supabaseUrl}/functions/v1/api/:path*`,
    },
  ];
}
```

This pattern guarantees that the browser always talks to the origin host on `/api/...`, making OAuth cookies and session headers work identically in local development and production.

