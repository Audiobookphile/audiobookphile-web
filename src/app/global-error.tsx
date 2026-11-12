'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center text-foreground">
          <h1 className="mb-2 text-4xl font-bold">Something went critically wrong</h1>
          <p className="mx-auto mb-6 max-w-md text-foreground-muted">
            A critical error occurred. We&apos;ve been notified and are looking into it.
          </p>
          <button
            onClick={() => reset()}
            className="rounded-lg bg-black px-8 py-2 font-medium text-white transition-colors hover:bg-gray-800"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  )
}
