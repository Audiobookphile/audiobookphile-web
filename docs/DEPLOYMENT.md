# Deployment & Template Guide

Audiobookphile Web is designed for instant zero-configuration deployment to **Vercel** as an open-source template.

---

## 1. One-Click Vercel Template Deployment

Deploy your own instance of Audiobookphile with a single click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FAudiobookphile%2Faudiobookphile-web&project-name=audiobookphile&repository-name=audiobookphile-web&integration-ids=oac_V3R1GIpkoZwAOoGGteLHPUWa)

### Automatic Supabase Integration Mapping
By including the `integration-ids=oac_V3R1GIpkoZwAOoGGteLHPUWa` parameter, Vercel prompts you to connect or create a Supabase instance during deployment. The integration automatically provisions and links:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. First-Time Setup Wizard (`/setup`)

When deploying against a fresh Supabase database:
1. Navigate to `https://your-deployment.vercel.app/setup`.
2. The setup wizard automatically checks if any root admin user exists.
3. If uninitialized, it presents a secure setup form to create the primary administrator account.
4. Once the root user is created, the `/setup` route permanently locks to prevent unauthorized re-initialization.

---

## 3. Environment Variable Reference

| Variable | Required | Description |
|---|:---:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Your Supabase project URL (e.g., `https://xyz.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Supabase anonymous public API key. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Supabase secret service role key for administrative server actions. |
| `NEXT_PUBLIC_SITE_URL` | *Optional* | Canonical URL of the deployment (defaults to Vercel production domain). |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | *Optional* | Public contact email for support and privacy inquiries. |
| `NEXT_PUBLIC_POSTHOG_KEY` | *Optional* | PostHog project API key for privacy-friendly analytics. |
| `NEXT_PUBLIC_POSTHOG_HOST` | *Optional* | PostHog ingestion host (defaults to `https://us.i.posthog.com`). |
| `NEXT_PUBLIC_SENTRY_DSN` | *Optional* | Client-side Sentry error monitoring DSN. |
| `SENTRY_DSN` | *Optional* | Server-side Sentry error monitoring DSN. |

