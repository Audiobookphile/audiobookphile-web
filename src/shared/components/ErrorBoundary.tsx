'use client'

import { AlertCircle, Home, RefreshCw } from 'lucide-react'
import { catchError, type ErrorInfo } from 'next/error'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

function ErrorFallback({ title }: { title: string }, { error, retry }: ErrorInfo) {
  const t = useTranslations('ErrorBoundary')
  const errorMessage = error instanceof Error ? error.message : String(error)

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-4 text-center">
      <AlertCircle className="text-destructive h-12 w-12" aria-hidden="true" />
      <h2 className="text-2xl font-bold">{title || t('title')}</h2>
      <p className="text-muted-foreground max-w-md">{errorMessage}</p>
      <div className="flex gap-2">
        <button
          onClick={() => retry()}
          className="text-primary-foreground inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t('retry')}
        </button>
        <Link
          href="/"
          className="border-input inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-foreground hover:bg-accent"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          {t('goHome')}
        </Link>
      </div>
    </div>
  )
}

export default catchError(ErrorFallback)
