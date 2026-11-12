import * as Sentry from '@sentry/nextjs'

Sentry.init({
  // Edge runtime: same DSN fallback as the server config.
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: false,
  environment: process.env.NODE_ENV || 'development',
  tracePropagationTargets: ['localhost', /^https:\/\/[a-z0-9]+\.supabase\.co/],
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || undefined,
  integrations: [Sentry.extraErrorDataIntegration()],
  attachStacktrace: true,
  maxValueLength: 8192,
  normalizeDepth: 10,
})
