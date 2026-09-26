import type { LibraryItem } from '@/types/api'

/**
 * Build cover URL for a library item
 *
 * The endpoint 302-redirects to the object stored in the `covers` bucket and
 * performs no processing, so there is no "raw vs processed" variant to ask
 * for: the bytes you get are the bytes that were uploaded. Callers that used to
 * pass `raw=1` were sending a parameter the API does not declare (its query
 * schema accepts only `force`), so it was silently dropped while implying a
 * distinction that does not exist.
 *
 * @param libraryItemId
 * @param timestamp - Optional timestamp for cache busting (typically updatedAt)
 * @returns Cover URL
 */
export function getLibraryItemCoverUrl(libraryItemId: string, timestamp?: number | null): string {
  const params = new URLSearchParams()
  // `ts` must be a STABLE, content-derived value. Falling back to Date.now()
  // produced a brand-new URL on every re-render for items whose updatedAt is 0,
  // which re-triggered MediaCardCover's "src changed -> imageReady = false"
  // effect and left covers stuck on the loading placeholder. updated_at is
  // bumped by the library_items cover trigger whenever cover_path changes, so
  // 0 is a safe, cacheable fallback.
  params.set('ts', String(timestamp || 0))
  const fallbackUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/api`
    : 'http://localhost:54321/functions/v1/api'
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || fallbackUrl
  return `${apiUrl}/items/${libraryItemId}/cover?${params.toString()}`
}

/**
 * Re-requests a cover URL past the browser cache, after a load failure.
 *
 * This is a *client-side* cache-buster and nothing more. It deliberately does
 * NOT send `force=1`, which is the one parameter the cover endpoint actually
 * acts on: `force` makes the server re-query the metadata providers and can
 * persist the terminal `missing` sentinel on a transient blip, so firing it
 * from a card hover would both hammer the providers and risk stripping a cover
 * that is perfectly fetchable. Re-issuing the request is enough to retry a
 * dropped connection or a cold edge cache.
 *
 * @param src - The cover URL to re-request
 * @param attempt - 1-based retry counter; 0 returns the URL unchanged
 */
export function withCoverRetry(src: string, attempt: number): string {
  if (!src || attempt <= 0) return src
  const sep = src.includes('?') ? '&' : '?'
  return `${src}${sep}cb=${attempt}`
}

/**
 * Build URL for a library file (requires authentication)
 *
 * Authentication is handled via httpOnly cookies through the Next.js internal API proxy.
 * The browser automatically includes the access_token cookie with the request.
 * If the token expires, the Next.js proxy will refresh the session automatically.
 *
 * @param libraryItemId
 * @param fileIno - The file inode value
 * @returns Library file URL (authentication via cookies)
 */
export function getLibraryFileUrl(libraryItemId: string, fileIno: string): string {
  return `/internal-api/items/${libraryItemId}/file/${fileIno}`
}

/**
 * Get placeholder cover image URL
 */
export function getPlaceholderCoverUrl(): string {
  return '/images/book_placeholder.jpg'
}

/**
 * `cover_path = 'missing'` is a TERMINAL verdict written by the backend after
 * metadata providers confirmed a work genuinely has no cover art. It is not a
 * storage path.
 *
 * The `/:id/cover` endpoint answers the sentinel with a JSON 404, and a JSON
 * body in an `<img>` request is blocked by the browser's ORB (no-sniff) as a
 * cross-origin resource, surfacing as `net::ERR_BLOCKED_BY_ORB` instead of a
 * clean `onError`. It is also a request that can never succeed, so rendering
 * the placeholder directly is both correct and cheaper. `?force=1` is the only
 * way to re-attempt a sentinel item, which the cover editor drives explicitly.
 */
export const MISSING_COVER_SENTINEL = 'missing'

export function isMissingCoverPath(coverPath: string | null | undefined): boolean {
  return coverPath === MISSING_COVER_SENTINEL
}

export function getLibraryItemCoverSrc(
  libraryItem: { id: string; updatedAt?: number; coverPath?: string | null },
  placeholder: string
): string {
  if (isMissingCoverPath(libraryItem.coverPath)) return placeholder
  // Otherwise always return the dynamic API URL so that the backend can attempt
  // to fetch covers on the fly. It returns a 404 only when no art is
  // obtainable, at which point the frontend falls back to the placeholder via
  // the `onError` handler in MediaCardCover.
  const timestamp = 'updatedAt' in libraryItem ? libraryItem.updatedAt : undefined
  return getLibraryItemCoverUrl(libraryItem.id, timestamp ?? null)
}

/**
 * Get cover aspect ratio from cover aspect ratio setting
 * coverAspectRatioSetting is 0 or 1
 * 0 = standard (1.6)
 * 1 = square (1)
 */
export function getCoverAspectRatio(coverAspectRatioSetting: 0 | 1 | undefined): number {
  if (coverAspectRatioSetting === 1) {
    return 1
  } else {
    return 1.6
  }
}
