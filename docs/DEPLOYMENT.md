# Deployment & Template Guide

Audiobookphile Web deploys to **Vercel** with a Supabase backend. The Vercel integration provisions the database and credentials automatically; two things still need one manual step per deployment — the **Edge API** and the **Supabase Auth URLs** — because neither can be inferred from environment variables alone.

For the full operational reference (Bun runtime, supply-chain policy, container builds), see the root [DEPLOYMENT.md](../DEPLOYMENT.md).

---

## 1. One-Click Vercel Template Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FAudiobookphile%2Faudiobookphile-web&project-name=audiobookphile&repository-name=audiobookphile-web&integration-ids=oac_VqOgBHqhEoFTPzGkPd7L0iH6)

The `integration-ids=oac_VqOgBHqhEoFTPzGkPd7L0iH6` parameter links the official **Supabase** integration. During the flow Vercel asks you to create or connect a Supabase project and then injects:

- `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY`
- `POSTGRES_URL` and `POSTGRES_URL_NON_POOLING`

No variable renaming is required — `src/shared/utils/supabase/env.ts` resolves both the canonical and Marketplace names.

---

## 2. First-Time Setup Wizard (`/setup`)

1. Open `https://<your-deployment>/setup`.
2. The wizard checks whether the schema exists and whether any administrator already exists.
3. On a fresh project it bootstraps `supabase/schema.sql` (tables, RLS, storage buckets, RPCs) and creates the first account as `root`.
4. Once an administrator exists, `/setup` reports the instance as ready and the unauthenticated bootstrap endpoint returns `409`.

**Use one schema path, not two.** The wizard applies `schema.sql`, which is a consolidated snapshot and does not write `supabase_migrations` history. If you initialize with `bun run db:push` instead, do not run the wizard's bootstrap afterwards (and vice versa) — replaying migrations onto an already-provisioned database is how the two paths drift.

---

## 3. Deploy the Edge API (Required)

The web app rewrites every `/api/*` request to `https://<ref>.supabase.co/functions/v1/api/*`. There is **no PostgREST fallback** for login, library, playback, or media routes. A deployment without the `api` function can create its administrator but cannot sign in.

From your machine:

```bash
export SUPABASE_ACCESS_TOKEN=sbp_...     # Supabase → Account → Access Tokens
export SUPABASE_PROJECT_ID=abcdefghijklmnopqrst

bun run db:push          # apply supabase/migrations
bun run functions:deploy # deploy supabase/functions/api
```

Or add both values as GitHub repository secrets and let the **Deploy Supabase (Migrations & Edge API)** workflow do it on every push that touches `supabase/**`. That job runs on hosted `ubuntu-latest` by default; set the `SUPABASE_RUNNER` repository variable to a JSON array (`["self-hosted","Linux","ram-3g"]`) to use your own runners.

Verify with:

```bash
curl -s "https://<ref>.supabase.co/functions/v1/api/health" -H "apikey: <anon-key>"
```

The `/setup` diagnostics panel shows the same check as **Edge API: Active (HTTP 200)**.

---

## 4. Supabase Auth URLs and `SITE_URL`

Supabase generates confirmation, magic-link, reset, and invite URLs server-side. Two settings control where they point:

1. **Authentication → URL Configuration** in the Supabase dashboard
   - **Site URL**: your canonical deployment URL (e.g. `https://audiobookphile.example.com`).
   - **Redirect URLs**: add `https://<your-domain>/auth/callback` and `https://<your-domain>/auth/confirm`. Add preview patterns such as `https://<project>-*.vercel.app/**` if you use Preview deployments.
2. **Edge Function secret `SITE_URL`** (Supabase → Edge Functions → Secrets)
   - Set it to the same canonical URL. `getWebOrigin()` in `supabase/functions/api/_shared/proxy.ts` uses it to build email links; the server actions also send an `X-Web-Origin` header for deployments that have not set it yet.
   - There is no fallback to Audiobookphile's own domain: an unset origin produces request-derived links, never links to somebody else's instance.

Keep `NEXT_PUBLIC_SITE_URL` in Vercel aligned with these values so OAuth redirects and server-generated links agree.

---

## 5. Environment Variable Reference

| Variable | Required | Description |
|---|:---:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Supabase project URL (e.g. `https://xyz.supabase.co`). Injected by the integration. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Supabase anon/publishable key. Injected by the integration. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Server-only service role key for administrative actions. Never expose it to the browser. Injected by the integration. |
| `POSTGRES_URL_NON_POOLING` | **Yes** | Direct Postgres connection used by the setup wizard for DDL. Injected by the integration. |
| `NEXT_PUBLIC_SITE_URL` | *Recommended* | Canonical URL of the deployment (defaults to the Vercel production domain). |
| `SITE_URL` | *Recommended* | **Edge Function secret** (not a Vercel variable) used for invite/reset/magic-link origins. |
| `SUPABASE_ACCESS_TOKEN` | *Optional* | Supabase Management API token; lets the wizard bootstrap without a direct Postgres connection and enables the GitHub workflow. |
| `SUPABASE_PROJECT_ID` | *Optional* | Supabase project ref for CLI/Management API deployments. |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | *Optional* | Public contact email for support and privacy inquiries. |
| `NEXT_PUBLIC_POSTHOG_KEY` | *Optional* | PostHog project API key for analytics. |
| `NEXT_PUBLIC_POSTHOG_HOST` | *Optional* | PostHog ingest host (default `https://us.i.posthog.com`). |
| `NEXT_PUBLIC_SENTRY_DSN` | *Optional* | Client-side Sentry DSN. |
| `SENTRY_DSN` | *Optional* | Server-side Sentry DSN. |

Backblaze B2 variables (`B2_*`) are optional and only needed for large-file offloading; see `.env.example` and the root guide.

---

## 6. Post-Deploy Checklist

- [ ] Deployment URL opens and `/setup` reports **Supabase: Connected**.
- [ ] **Edge API: Active (HTTP 200)** on `/setup`.
- [ ] Root administrator created (or `db:push` applied).
- [ ] Supabase Auth **Site URL** and **Redirect URLs** point at this deployment.
- [ ] `SITE_URL` Edge secret set to this deployment.
- [ ] Login works; library loads.
- [ ] Invite a second user and confirm the email link points at this deployment's domain.
- [ ] Storage buckets `covers`, `audio-files`, and `backups` exist.
