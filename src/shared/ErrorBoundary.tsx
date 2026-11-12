'use client'

import * as Sentry from '@sentry/nextjs'
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  fallback?: ReactNode
  onError?: (props: { error: Error; resetErrorBoundaries: () => void }) => ReactNode
  children: ReactNode
  /** Optional context for Sentry error grouping */
  context?: Record<string, string | number | boolean>
  /** Optional component name for better error tracking */
  componentName?: string
}

interface ErrorBoundaryState {
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Enhanced Error Boundary with Sentry integration.
 *
 * Features:
 * - Automatic Sentry error reporting with context
 * - Component name tagging for easier debugging
 * - Custom fallback UI support
 * - Error reset functionality
 * - Detailed error information capture
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, errorInfo: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Capture error state
    this.setState({ errorInfo })

    // Log to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // Report to Sentry with enhanced context
    Sentry.withScope((scope) => {
      // Tag with component name if provided
      if (this.props.componentName) {
        scope.setTag('component', this.props.componentName)
      }

      // Add component stack for better debugging
      if (errorInfo.componentStack) {
        scope.setExtra('componentStack', errorInfo.componentStack)
      }

      // Add custom context if provided
      if (this.props.context) {
        Object.entries(this.props.context).forEach(([key, value]) => {
          scope.setExtra(key, value)
        })
      }

      // Set error fingerprint for better grouping
      scope.setFingerprint(['{{ default }}', this.props.componentName || 'unknown', error.message])

      // Capture the error
      Sentry.captureException(error)
    })
  }

  resetErrorBoundaries = () => {
    this.setState({ error: null, errorInfo: null })
  }

  render() {
    if (this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Use custom error renderer if provided
      if (this.props.onError) {
        return this.props.onError({
          error: this.state.error,
          resetErrorBoundaries: this.resetErrorBoundaries,
        })
      }

      // Default error UI
      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center p-4 text-center">
          <div className="mb-4 text-4xl">⚠️</div>
          <h2 className="mb-2 text-lg font-semibold">Something went wrong</h2>
          <p className="mb-4 text-sm text-gray-600">{this.state.error.message || 'An unexpected error occurred'}</p>
          <button
            onClick={this.resetErrorBoundaries}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-600"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
