/**
 * Demo-mode gating.
 *
 * The public demo account (`demo@audiobookphile.app`) only exists in the
 * dedicated Audiobookphile demo backend. Any other deployment is somebody's
 * own instance: showing the demo box there would advertise a login that does
 * not exist, and publishing the demo credentials on every template deployment
 * invites confusion (and pointless failed logins) rather than a demo.
 *
 * So the demo UI and the `/api/setup/status` demo payload are gated on the
 * host the request arrived on. Only hosts the project actually controls can
 * opt in — deliberately not a `*.vercel.app` wildcard, because a template
 * deployment is free to be named `audiobookphile-something.vercel.app`.
 */

/** Domains owned by the project. Subdomains of these are also demo hosts. */
const OFFICIAL_DEMO_DOMAINS = ['audiobookphile.app'] as const

/** Exact hosts that serve the demo but are not subdomains of the domain above. */
const OFFICIAL_DEMO_HOSTS = new Set([
  'audiobookphile.app',
  'audiobookphile.vercel.app',
  'audiobookphile.foodshare.club',
])

/**
 * Reduce a `Host` / `X-Forwarded-Host` header (or an origin) to a bare
 * hostname. Accepts `example.com`, `example.com:443`, full origins, and
 * comma-separated proxy chains (the first entry wins).
 */
export function normalizeHost(value: string | null | undefined): string | null {
  if (!value) return null

  const first = value.split(',')[0]?.trim()
  if (!first) return null

  try {
    const url = new URL(first.includes('://') ? first : `https://${first}`)
    return url.hostname.toLowerCase().replace(/\.$/, '')
  } catch {
    return null
  }
}

/**
 * True when the request is being served by an official Audiobookphile demo
 * deployment. Everything else — localhost, Vercel previews, a deployer's own
 * domain — is a private instance and must not show demo credentials.
 */
export function isOfficialDemoHost(host: string | null | undefined): boolean {
  const normalized = normalizeHost(host)
  if (!normalized) return false

  if (OFFICIAL_DEMO_HOSTS.has(normalized)) return true

  return OFFICIAL_DEMO_DOMAINS.some((domain) => normalized.endsWith(`.${domain}`))
}
