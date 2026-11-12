'use client'

import { useEffect } from 'react'
import { loadAnalytics, posthogEnabled } from '@/shared/lib/analytics'

/**
 * The analytics tracker, loaded after the page.
 *
 * posthog-js is 84 KB gzipped, and it is analytics: nothing a visitor is
 * waiting for depends on it. Loading it at module scope put it in the root
 * layout's chunk graph, so every page -- the login page included -- shipped
 * it before it could render.
 *
 * There is no React context here any more. The provider in `posthog-js/react`
 * exists to put the client in a context, and the only thing that read that
 * context was the facade in `shared/lib/analytics`, which now holds the
 * client itself. Dropping it also drops `posthog-js/react`, which imports
 * `posthog-js` and would have put the tracker back in the graph.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!posthogEnabled) return
    void loadAnalytics()
  }, [])

  return <>{children}</>
}
