import { Context } from "hono";

const SUPABASE_HOST_SUFFIX = ".supabase.co";

/**
 * Normalizes an origin-like value to `scheme://host[:port]`.
 *
 * Rejects anything that is not http(s) and rejects Supabase's own hostnames:
 * `https://<ref>.supabase.co/auth/callback` is a dead end, never a web origin.
 * Returns `null` for unusable input so callers can fall through.
 */
function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.hostname === "supabase.co" || url.hostname.endsWith(SUPABASE_HOST_SUFFIX)) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Resolves the true origin URL of the incoming request, taking into account
 * proxy headers set by Vercel or other reverse proxies.
 *
 * @param c The Hono context
 * @returns The resolved origin string (e.g. "https://audiobookphile.app")
 */
export function getProxyOrigin(c: Context): string {
  const host = c.req.header("x-forwarded-host") || c.req.header("host");
  if (!host) {
    // Direct calls may arrive without host headers. The request URL is still
    // the real origin in that case; a hardcoded localhost fallback would be
    // wrong on a deployed instance.
    return new URL(c.req.url).origin;
  }

  const protocol = c.req.header("x-forwarded-proto") || "https";
  return `${protocol}://${host}`;
}

/**
 * Resolves the canonical WEB origin for email links (magic link, password
 * reset, invites).
 *
 * Next.js rewrites forward the request to the Edge Function with the Supabase
 * host in `host`, so the request-derived origin would produce dead links like
 * `https://<ref>.supabase.co/auth/callback`. Resolution order:
 *
 *  1. `SITE_URL` — the operator's explicit choice for this deployment.
 *  2. `X-Web-Origin` — set by this repository's server actions, which know
 *     their own deployment origin (including Preview URLs).
 *  3. The request origin, which is only correct when the function is reached
 *     without the rewrite (local development or a direct call).
 *
 * There is deliberately no production-domain fallback: a deployer's instance
 * must never email links pointing at Audiobookphile's own site.
 *
 * @param c The Hono context
 * @returns The canonical web origin (e.g. "https://audiobookphile.app")
 */
export function getWebOrigin(c: Context): string {
  const fromEnv = normalizeOrigin(Deno.env.get("SITE_URL"));
  if (fromEnv) return fromEnv;

  const fromHeader = normalizeOrigin(c.req.header("x-web-origin"));
  if (fromHeader) return fromHeader;

  const derived = getProxyOrigin(c);
  console.warn(
    "[proxy] Neither SITE_URL nor X-Web-Origin is set; deriving the email-link origin from the request:",
    derived,
  );
  return normalizeOrigin(derived) ?? derived;
}
