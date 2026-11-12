'use client'

import { useEffect } from 'react'

/**
 * Register the service worker.
 *
 * The registration happens after the page has hydrated, so it never
 * competes with the first paint for bandwidth, and it is deliberately not
 * done on a development build: a service worker that caches the build
 * output is a stale app waiting to happen.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    const register = (): void => {
      navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
        // A failed registration is not worth breaking the page over: the
        // app works without it, it just will not be installable.
        console.warn('[ServiceWorkerRegistrar] registration failed:', error)
      })
    }

    // Registering while the page is still loading competes with the
    // resources the page needs first.
    if (document.readyState === 'complete') {
      register()
      return
    }
    window.addEventListener('load', register, { once: true })
    return () => window.removeEventListener('load', register)
  }, [])

  return null
}
