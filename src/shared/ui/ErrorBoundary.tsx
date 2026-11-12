'use client'

import * as Sentry from '@sentry/nextjs'
import { AlertTriangle, RefreshCcw } from 'lucide-react'
import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children?: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } })
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex h-[100dvh] w-full flex-col items-center justify-center bg-zinc-950 p-6 text-center text-zinc-200">
          <div className="mb-6 rounded-full bg-red-500/10 p-4">
            <AlertTriangle className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight">Something went wrong.</h1>
          <p className="mb-8 max-w-md text-sm text-zinc-400">
            We&apos;ve encountered an unexpected error. Please try refreshing the page. If the problem persists, contact
            support.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
            className="flex items-center gap-2 rounded-lg bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 active:bg-zinc-300"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
