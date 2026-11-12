/**
 * Sentry integration utilities for React components.
 *
 * This module provides:
 * - Easy error capturing with context
 * - User identification
 * - Breadcrumb tracking
 * - Performance monitoring helpers
 * - Web Vitals tracking
 * - Distributed tracing helpers
 * - User feedback collection
 * - Health checks
 */

import * as Sentry from '@sentry/nextjs'

import { ErrorBoundary } from '../ErrorBoundary'

/**
 * Set the current user context in Sentry.
 * Call this after authentication.
 */
export function setSentryUser(user: { id: string; email?: string; username?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  })
}

/**
 * Clear user context (call on logout).
 */
export function clearSentryUser() {
  Sentry.setUser(null)
}

/**
 * Add a breadcrumb for user action tracking.
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, string | number | boolean>) {
  Sentry.addBreadcrumb({
    category,
    message,
    level: 'info',
    data,
    timestamp: Date.now() / 1000,
  })
}

/**
 * Track a user action (convenience wrapper).
 */
export function trackUserAction(action: string, details?: Record<string, string | number | boolean>) {
  addBreadcrumb(`User action: ${action}`, 'user', details)
}

/**
 * Track a navigation event.
 */
export function trackNavigation(from: string, to: string) {
  addBreadcrumb(`Navigated from ${from} to ${to}`, 'navigation', { from, to })
}

/**
 * Track an API call.
 */
export function trackApiCall(endpoint: string, method: string, status: number, duration: number) {
  addBreadcrumb(`API call: ${method} ${endpoint}`, 'http', {
    endpoint,
    method,
    status,
    duration,
  })
}

/**
 * Capture an error with additional context.
 */
export function captureError(
  error: Error,
  context?: {
    tags?: Record<string, string>
    extra?: Record<string, string | number | boolean | null>
    fingerprint?: string[]
  }
) {
  Sentry.withScope((scope) => {
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value)
      })
    }

    if (context?.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value)
      })
    }

    if (context?.fingerprint) {
      scope.setFingerprint(context.fingerprint)
    }

    Sentry.captureException(error)
  })
}

/**
 * Track a custom performance metric.
 */
export function trackPerformance(
  name: string,
  value: number,
  unit: 'millisecond' | 'second' | 'minute' = 'millisecond'
) {
  Sentry.metrics.distribution(name, value, { unit })
}

/**
 * Measure performance of an async operation.
 */
export async function measurePerformance<T>(name: string, operation: () => Promise<T>): Promise<T> {
  const startTime = performance.now()

  try {
    const result = await operation()
    const duration = performance.now() - startTime
    trackPerformance(name, duration, 'millisecond')
    return result
  } catch (error) {
    const duration = performance.now() - startTime
    trackPerformance(`${name}.error`, duration, 'millisecond')
    throw error
  }
}

/**
 * Higher-order component for automatic error tracking.
 */
export function withSentryTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
): React.FC<P> {
  const TrackedComponent = (props: P) => {
    return (
      <ErrorBoundary componentName={componentName} context={{ componentName }}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }

  TrackedComponent.displayName = `withSentryTracking(${componentName})`
  return TrackedComponent
}

/**
 * Collect user feedback after an error.
 * Call this when you want to show a feedback dialog to the user.
 */
export function collectUserFeedback(error?: Error): void {
  const eventId = error ? Sentry.captureException(error) : Sentry.lastEventId()

  if (!eventId) {
    console.warn('No error event to collect feedback for')
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

/**
 * Health check for Sentry integration.
 * Verifies that Sentry is properly configured and can send events.
 */
export async function checkSentryHealth(): Promise<{
  initialized: boolean
  client: boolean
  testEvent?: string
  error?: string
}> {
  try {
    const client = Sentry.getClient()

    if (!client) {
      return {
        initialized: false,
        client: false,
        error: 'Sentry client not initialized',
      }
    }

    // Send a test event
    const eventId = Sentry.captureMessage('Sentry health check', 'debug')

    return {
      initialized: true,
      client: true,
      testEvent: eventId,
    }
  } catch (error) {
    return {
      initialized: false,
      client: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Start a distributed trace span for outgoing API calls.
 * Propagates trace context to backend services.
 */
export function startApiTrace(endpoint: string, method: string): () => void {
  const span = Sentry.startInactiveSpan({
    name: `${method} ${endpoint}`,
    op: 'http.client',
    attributes: {
      'http.url': endpoint,
      'http.method': method,
    },
  })

  return () => {
    span.end()
  }
}

/**
 * Create trace headers for outgoing requests.
 * Use this to propagate trace context to backend services.
 *
 * Uses the stable Sentry SDK v8 public API:
 * - `Sentry.getActiveSpan()` (replaces deprecated `scope.getSpan()`)
 * - `Sentry.spanToTraceHeader()` (replaces non-existent `traceContext().toTraceparent()`)
 * - `Sentry.spanToBaggageHeader()` (replaces non-existent `traceContext().toBaggage()`)
 */
export function createTraceHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  const span = Sentry.getActiveSpan()

  if (span) {
    headers['sentry-trace'] = Sentry.spanToTraceHeader(span)

    const baggage = Sentry.spanToBaggageHeader(span)
    if (baggage) {
      headers['baggage'] = baggage
    }
  }

  return headers
}
