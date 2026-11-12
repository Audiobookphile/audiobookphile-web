'use client'

import * as Sentry from '@sentry/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import Btn from '@/shared/ui/Btn'

const MAX_AUTO_RESETS = 2

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter()
  const resetCountRef = useRef(0)

  useEffect(() => {
    Sentry.captureException(error, {
      tags: { digest: error?.digest ?? 'none' },
      contexts: {
        crash: {
          route: typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : 'unknown',
        },
      },
    })
    console.error('Application Error:', error)
  }, [error])

  // Production-safe one-liner: the message (never the stack) is shown so a
  // crash report from a user actually names the failure instead of just a
  // digest hash. Backend ApiErrors carry the server reason in .message.
  const shortMessage = `${error?.name ?? 'Error'}: ${error?.message ?? 'unknown'}`.slice(0, 300)

  const buildDiagnostics = () => {
    return [
      `digest: ${error?.digest ?? 'none'}`,
      `route: ${window.location.pathname}${window.location.search}`,
      `time: ${new Date().toISOString()}`,
      `ua: ${navigator.userAgent}`,
      `error: ${error?.name}: ${error?.message}`,
    ].join('\n')
  }

  const copyDiagnostics = () => {
    void navigator.clipboard?.writeText(buildDiagnostics())
  }

  const handleTryAgain = () => {
    // Cap retries so a hard-failing route cannot loop forever.
    if (resetCountRef.current >= MAX_AUTO_RESETS) {
      router.push('/account')
      return
    }
    resetCountRef.current += 1
    reset()
  }

  const handleGoHome = () => {
    // Leave the crashed route. "/" redirects to the default library — if we
    // crashed there, land on a known-good page instead of bouncing back.
    router.push('/account')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center text-foreground">
      <div className="mb-8">
        <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-error/10">
          <svg className="h-10 w-10 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="mb-2 text-4xl font-bold">Something went wrong</h1>
        <p className="mx-auto max-w-md text-foreground-muted">
          An unexpected error occurred. We&apos;ve been notified and are looking into it.
        </p>
        <p className="mx-auto mt-3 max-w-md font-mono text-xs break-words text-foreground-subdued">{shortMessage}</p>
        {error?.digest && <p className="mt-4 font-mono text-xs text-foreground-subdued">digest: {error.digest}</p>}
        {typeof window !== 'undefined' && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={copyDiagnostics}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground-subdued transition-colors hover:text-foreground"
            >
              Copy diagnostics
            </button>
            <span className="font-mono text-xs text-foreground-subdued">{window.location.pathname}</span>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <Btn onClick={handleTryAgain} className="px-8 py-2">
          Try Again
        </Btn>
        <Btn onClick={handleGoHome} color="bg-black-400" className="px-8 py-2">
          Go Home
        </Btn>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="mt-12 max-w-2xl overflow-auto rounded-lg bg-black/20 p-4 text-left font-mono text-xs">
          <p className="mb-2 font-bold text-error">Debug Info:</p>
          <pre>{error.stack}</pre>
        </div>
      )}
    </div>
  )
}
