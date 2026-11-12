# Audiobookphile Web Documentation 📚

Welcome to the documentation for [`audiobookphile-web`](https://github.com/Audiobookphile/audiobookphile-web), the modern Next.js 16 streaming web client for the Audiobookphile ecosystem.

## Documentation Index

- [**Architecture Guide**](./ARCHITECTURE.md): Next.js 16 App Router design, Server Components vs Client Components, API reverse proxying, and data flow.
- [**Audio Engine & Playback**](./AUDIO_ENGINE.md): HTML5 / Web Audio streaming runtime, MediaSession API integration, audio queue contracts, and cover caching.
- [**State Management**](./STATE_MANAGEMENT.md): Reactive state stores, authentication session lifecycle, multi-tab sync, and optimistic UI.
- [**Deployment & Template Guide**](./DEPLOYMENT.md): 1-click Vercel deployment, Supabase Marketplace integration, First-Time Setup Wizard (`/setup`), and environment variable reference.
- [**Internationalization (i18n)**](./I18N.md): 21 supported languages, translation workflows with `next-intl`, and adding new locales.

---

## Quick Reference Commands

All commands run through **Bun**:

```bash
bun install          # Install dependencies
bun run dev          # Start local development server (http://localhost:3000)
bun run typecheck    # Fast Rust-based typecheck via tsrs
bun test             # Execute 250+ unit tests
bun run build        # Production Next.js build
bun run lint         # Lint codebase
bun run format       # Format codebase
```
