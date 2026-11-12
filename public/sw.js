/**
 * The service worker.
 *
 * The app was carrying `@ducanh2912/next-pwa`, which is a webpack plugin:
 * it hooks into the webpack build, and this project builds with Turbopack,
 * so it did nothing at all. There was a web app manifest and no service
 * worker, which is not a PWA -- it is a web page that claims to be one.
 *
 * So this is the service worker, and it is deliberately conservative:
 *
 *   - The immutable, hashed assets are served from the cache first. Their
 *     names change with their content, so a cached one is never stale.
 *   - Everything else -- the pages, the API, the data -- goes to the
 *     network, always. An authenticated app's HTML and its data are
 *     per-user, and a cached copy of either is a bug, not an optimisation.
 *
 * It never serves a cached page, so a deployment is never shadowed by an
 * older one, and the cache only ever holds files whose names cannot be
 * reused.
 */

const CACHE = 'audiobookphile-v1'

/** How many assets to keep. The cache is a convenience, not a store. */
const MAX_ENTRIES = 120

self.addEventListener('install', () => {
  // Nothing to precache: the shell is authenticated, per-user HTML, and
  // precaching it would mean serving one user another's page.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)))
      await self.clients.claim()
    })()
  )
})

/**
 * Keep the cache from growing without bound.
 */
const trim = async (cache) => {
  const keys = await cache.keys()
  if (keys.length <= MAX_ENTRIES) return
  await Promise.all(keys.slice(0, keys.length - MAX_ENTRIES).map((key) => cache.delete(key)))
}

self.addEventListener('fetch', (event) => {
  const request = event.request

  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // The hashed build output. The name changes when the content does, so
  // this is the one thing that is safe to serve from a cache.
  if (!url.pathname.startsWith('/_next/static/')) return

  event.respondWith(
    (async () => {
      const cached = await caches.match(request)
      if (cached) return cached

      const response = await fetch(request)
      if (response.ok) {
        const cache = await caches.open(CACHE)
        await cache.put(request, response.clone())
        await trim(cache)
      }
      return response
    })()
  )
})
