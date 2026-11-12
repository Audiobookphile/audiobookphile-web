import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: false,
  environment: process.env.NODE_ENV || 'development',
  release:
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_SENTRY_RELEASE ||
    process.env.SENTRY_RELEASE ||
    undefined,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
    Sentry.browserTracingIntegration(),
    Sentry.extraErrorDataIntegration(),
    Sentry.reportingObserverIntegration(),
    Sentry.httpClientIntegration(),
    Sentry.browserProfilingIntegration(),
  ],
  // GitHub integration for issue creation
  attachStacktrace: true,
  maxValueLength: 8192,
  normalizeDepth: 10,
  sendDefaultPii: false,
  // Spotlight for local development — top-level option (replaces deprecated _experiments)
  spotlight: process.env.NODE_ENV === 'development',
})

/**
 * Web Vitals tracking (LCP, CLS, FID, INP).
 * Uses Sentry.addBreadcrumb for error context and metrics.distribution
 * for dashboard visibility.
 */
export function reportWebVitals(metrics: { name: string; value: number; id: string }): void {
  const { name, value, id } = metrics

  Sentry.metrics.distribution(`web_vitals.${name.toLowerCase()}`, value, {
    attributes: { metric_id: id },
    unit: name === 'CLS' ? 'none' : 'millisecond',
  })

  Sentry.addBreadcrumb({
    category: 'web-vitals',
    message: `${name}: ${value.toFixed(2)}`,
    level: 'info',
    data: { metricId: id },
  })
}

/**
 * Health check — verifies Sentry client is initialized and can capture events.
 */
export function sentryHealthCheck(): { healthy: boolean; message: string } {
  const client = Sentry.getClient()
  if (!client) {
    return { healthy: false, message: 'Sentry client not initialized' }
  }
  const eventId = Sentry.captureMessage('Sentry health check', 'debug')
  return eventId
    ? { healthy: true, message: `Health check event sent: ${eventId}` }
    : { healthy: false, message: 'Failed to capture health check event' }
}

/**
 * User feedback dialog — shows after an error event.
 */
export function showUserFeedbackDialog(): void {
  const eventId = Sentry.lastEventId()
  if (!eventId) {
    console.warn('No recent error event to collect feedback for')
    return
  }

  Sentry.showReportDialog({
    eventId,
    title: 'Something went wrong',
    subtitle: "Our team has been notified. If you'd like to help, tell us what happened.",
    labelComments: 'What happened?',
    labelClose: 'Close',
    labelSubmit: 'Submit Feedback',
  })
}
