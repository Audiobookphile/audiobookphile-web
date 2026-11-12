# Audiobookphile 🎧

A serverless, open-source audiobook and podcast client. Built with Next.js 16, Supabase, and deployed effortlessly on Vercel.

Audiobookphile is designed for users who want a beautiful, premium "Liquid Glass" UI for their audiobooks, without the hassle of managing servers or docker containers. It's an excellent, zero-maintenance alternative to traditional self-hosted solutions.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FAudiobookphile%2Faudiobookphile-web&project-name=audiobookphile&repository-name=audiobookphile-web&integration-ids=oac_VqOgBHqhEoFTPzGkPd7L0iH6&skippable-integrations=1&env=NEXT_PUBLIC_SITE_URL&envDescription=Optional%3A%20Canonical%20public%20URL%20for%20OAuth%20redirects%20(defaults%20to%20your%20Vercel%20deployment%20domain)&envLink=https%3A%2F%2Fgithub.com%2FAudiobookphile%2Faudiobookphile-web%23environment-variables)

## Tech Stack

- **Framework**: Next.js 16 (App Router), tracking the canary channel
- **Auth & Database**: [Supabase](https://supabase.com) (Postgres + Auth + Storage)
- **Deployment**: [Vercel](https://vercel.com)
- **Styling**: Tailwind CSS v4 (Liquid Glass Aesthetic)
- **Package Manager**: [Bun](https://bun.sh)
- **Runtime**: [Bun](https://bun.sh) canary — dev server, production build, unit tests, container images, and Vercel functions all run on Bun. Node.js is not used, and `bunfig.toml` sets `[run] bun = true` so that a `node` call from any script, dependency or shebang is answered with Bun. See [DEPLOYMENT.md §4](./DEPLOYMENT.md#4-runtime-bun).
- **Toolchain**: [Bun](https://bun.sh) for the linter (`bun lint`), formatter (`bun fmt`), test runner (`bun test`) and dependency audit (`bun audit`); [tsrs](https://github.com/oxc-project/tsrs) — Cloudflare's Rust port of the TypeScript compiler — as the **only** type checker, in the editor, in every gate and in the build itself. One compiler means one verdict: "the build passed" and "the gate passed" cannot mean different things. The repository's own lint rule covers the one thing tsrs's looser DOM types cannot see. There is no ESLint, oxlint, Prettier or Biome in this repository, and no Node.js runtime anywhere in the toolchain.
- **Supply chain**: a project-owned [install-time security scanner](./scripts/security-scanner.ts) runs on every `bun install` and cancels it — before the package is unpacked, and so before its `postinstall` script runs — if a package is below a security floor, resolves from somewhere other than the registry, or has an advisory the OSV database knows about. See [DEPLOYMENT.md §4.5.1](./DEPLOYMENT.md).
- **Editor**: tsrs also ships a language server, so the editor re-checks a changed file in about 50 ms instead of 0.5-20 s. See [`docs/neovim-lsp.lua`](docs/neovim-lsp.lua) for Neovim 0.11+. The language server needs the native binary, which tsrs publishes for five platforms; where there is none, the type check still runs — from the WebAssembly build of the same compiler.
- **First load**: the budget measures the *initial payload* — the chunks a route loads when it is first visited — because that is what a visitor waits for. A library in the app shell is paid for by every visitor on every page, so the two that used to be there (hls.js and posthog-js, 256 KB gzipped between them) are loaded on demand now, and the fonts are woff2 subsets rather than 246 KB TrueType files. See [DEPLOYMENT.md §4.8.9](./DEPLOYMENT.md).
- **Every request**: the session refresh happens when the token needs it, not on every request — the proxy used to pay a 120–270 ms round trip to the auth server before the page did any work at all. See [DEPLOYMENT.md §4.9](./DEPLOYMENT.md).

## One-Click Deployment (Vercel Template)

Audiobookphile is optimized for 1-click deployment on Vercel with automatic Supabase provisioning:

1. **Click Deploy**: Click the **Deploy with Vercel** button above.
2. **Auto-Map Supabase**: During the deployment flow, Vercel will prompt you to connect the official **Supabase Integration**. You can create a new Supabase project or select an existing one with one click.
3. **Automated Credentials**: Vercel and Supabase automatically map and inject all required environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, database connection strings) into your project.
4. **First-Time Setup Wizard**:
   - Once your deployment completes, visit your deployed site and follow the prompt or open `/setup`.
   - The interactive setup wizard verifies database connectivity, confirms storage buckets, and provides a direct link to execute `supabase/schema.sql` in the Supabase SQL editor.
   - You can then create your root administrator account directly through the setup wizard.
5. **Database & Edge Functions Management**:
   - For automated deployments of migrations and Edge Functions from GitHub Actions, add `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_ID` to your GitHub repository secrets.
   - Or deploy from your terminal with `bun run db:push` and `bun run functions:deploy`.

## Environment Variables

The canonical env source lives in the backend repo (`audiobookphile-backend/env/local.env`). Generate your local env from it:

```bash
../audiobookphile-backend/scripts/sync-env.sh
```

Production and CI values are configured on the platforms (Vercel env vars, Supabase Edge Function secrets, GitHub Actions secrets) — never in env files.

`.env.example` lists every variable with documentation for the open-source community. Secrets are never stored in these files — configure them in Vercel (web), Supabase Vault, or Edge Function secrets.

| Variable                        | Description                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Your Supabase project URL                                                                                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key                                                                                |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server-side service role key (never expose to browser)                                                       |
| `NEXT_PUBLIC_SITE_URL`          | Public URL of your app (required for OAuth redirects)                                                        |
| `NEXT_PUBLIC_POSTHOG_KEY`       | (Optional) PostHog analytics + feature flags (flags use `useFeatureFlag`, see `src/shared/lib/analytics.ts`) |
| `NEXT_PUBLIC_POSTHOG_HOST`      | (Optional) PostHog ingest host (default `https://us.i.posthog.com`)                                          |

Feature flags are read from PostHog. Existing flags: `passkey_2fa` (kill-switch for passkey/biometric 2FA — defaults ON, disable in PostHog to turn off without a deploy).

> `SUPABASE_SERVICE_ROLE_KEY` must never be prefixed with `NEXT_PUBLIC_` and must never appear in client-side code.

## Local Development

```bash
# Install the pinned Bun canary (see .mise.toml) and the dependencies
mise install
bun install

# Start the development server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **The Bun canary is required.** `bun lint` and `bun fmt` — the linter and
> formatter this project uses — exist only in canary builds; they are not in
> any released Bun. `.mise.toml` pins the canary channel, and
> `bun run lint` / `bun run format` fail with an actionable message rather
> than "Script not found" if you are on a stable Bun.

### Commands

Everything is Bun. `bun run <script>` is the entry point for all of them.

| Command | What it does |
| --- | --- |
| `bun dev` | Next.js dev server on Bun |
| `bun run build` | Production build (standalone output) |
| `bun start` | Serve the production build |
| `bun run lint` | Lint with `bun lint` |
| `bun run lint:fix` | Lint and apply fixes |
| `bun run format` | Format with `bun fmt` and sort the translation catalogues |
| `bun run format:check` | Check formatting without writing |
| `bun run typecheck` | Type check with tsrs (the Rust port of the TypeScript compiler) |
| `bun run test:unit` | Unit tests with `bun test`, in a random order |
| `bun run test` | Playwright end-to-end tests |
| `bun run size` | Client bundle budget — the total, and the initial payload a route loads |
| `bun run audit` | Dependency vulnerability scan with `bun audit` |
| `bun run scan` | The install-time security scanner, over the whole lockfile |
| `bun run scripts/node-api-scan.ts` | Repo-wide scan for Node.js APIs |
| `bun run lhci` | Lighthouse CI, running under Bun |
| `bun run supabase` | The Supabase CLI, running under Bun |
| `bun run types:sync` | Regenerate `src/types/supabase.ts` from the backend repo |

Configuration lives in two files: [`bunfig.toml`](./bunfig.toml) for Bun
itself — install policy, linter, formatter and test runner — and
[`.mise.toml`](./.mise.toml) for the pinned Bun canary.

## Database Setup & Migration

All schema changes are tracked as Supabase CLI migration files in `supabase/migrations/`.

```bash
# Install Supabase CLI
bunx supabase link --project-ref <your-project-ref>

# Apply all migrations
bunx supabase db push
```

### Migrating from Audiobookshelf (SQLite)

If you are coming from a traditional self-hosted Audiobookshelf instance and want to move your metadata to Audiobookphile's Postgres backend, we've included a migration toolkit! Check out the `supabase-migration-toolkit` skill/scripts to convert your SQLite schema and bulk-upload your data to Supabase.

## Hybrid Storage (Supabase + Backblaze B2)

The client supports a hybrid storage model to minimize cloud costs.

- **Small files (< 25MB):** Cover images, metadata files, and short podcast clips are securely uploaded directly to Supabase Storage.
- **Large files (>= 25MB):** Full audiobooks are securely uploaded directly to Backblaze B2 using S3 pre-signed URLs.

To enable this, provide the `B2_*` environment variables. The client and backend will seamlessly route uploads and playback between the two providers based on file size.

## CI/CD (GitHub Actions)

The repository comes pre-configured with two GitHub Actions workflows:

1. **Deploy Next.js Web App (`deploy-web.yml`)**: On pushes to `main` and PRs, runs the full verification pipeline — the tsrs type gate, Bun's own checker as a second opinion, `bun lint`, `bun fmt --check`, the unit suite, the production dependency audit, the deploy file check, a production build, and the client bundle budget. A separate job then runs Lighthouse CI. On `main` pushes it deploys a preview to Vercel via the Vercel CLI, runs the end-to-end suite against that preview, and promotes it to production only if the suite passes.
2. **CodeQL Security Scan (`codeql.yml`)**: Static security analysis on pushes, PRs, and a weekly schedule.

Both workflows install the Bun **canary**, not a pinned version: `bun lint` and `bun fmt` exist only in canary builds, so a stable Bun cannot run this pipeline at all.

Ensure you configure your GitHub Repository Secrets (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `LHCI_GITHUB_APP_TOKEN`, `PLAYWRIGHT_ADMIN_EMAIL`, `PLAYWRIGHT_ADMIN_PASSWORD`, `PLAYWRIGHT_MEMBER_EMAIL`, `PLAYWRIGHT_MEMBER_PASSWORD`) to enable production deploys and E2E verification.

## Container Images (Local / Self-Hosted)

A container setup is available if you prefer to host it yourself instead of Vercel.
The image contains Bun and nothing else — no Node.js runtime, no npm.

```bash
podman compose up -d --build
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Credits

Audiobookphile's web app descends from the [Audiobookshelf web client](https://github.com/advplyr/audiobookshelf). We forked it to build a serverless architecture (Supabase backend) that Audiobookshelf's self-hosted model never needed, and have since diverged significantly — this repository is a standalone project and no longer tracks upstream.

## Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you'd like to change. Please ensure you do not use any GPLv3 assets or proprietary logos from other projects when contributing.
