/**
 * useApiCall - Custom hook for type-safe API calls with error handling and Sentry integration.
 *
 * Features:
 * - Automatic error handling and Sentry reporting
 * - Loading state management
 * - Retry logic
 * - TypeScript inference
 * - Request cancellation
 */

import * as Sentry from '@sentry/nextjs'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface ApiCallState<T> {
  data: T | null
  error: Error | null
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
}

export interface UseApiCallOptions {
  /** Enable automatic Sentry error reporting */
  reportToSentry?: boolean
  /** Maximum number of retry attempts */
  maxRetries?: number
  /** Delay between retries in milliseconds */
  retryDelay?: number
  /** Callback on successful response */
  onSuccess?: (data: unknown) => void
  /** Callback on error */
  onError?: (error: Error) => void
  /** Component context for Sentry tagging */
  context?: string
}

/**
 * Custom hook for making API calls with comprehensive error handling.
 *
 * @example
 * ```tsx
 * const { execute, data, error, isLoading } = useApiCall<User>(
 *   async (id: string) => fetch(`/api/users/${id}`).then(r => r.json()),
 *   { context: 'UserProfile' }
 * )
 *
 * // Execute the API call
 * await execute('123')
 * ```
 */
export function useApiCall<T, Args extends unknown[] = unknown[]>(
  apiFunction: (...args: Args) => Promise<T>,
  options: UseApiCallOptions = {}
): {
  execute: (...args: Args) => Promise<T | null>
  reset: () => void
  data: T | null
  error: Error | null
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
} {
  const { reportToSentry = true, maxRetries = 0, retryDelay = 1000, onSuccess, onError, context } = options

  const [state, setState] = useState<ApiCallState<T>>({
    data: null,
    error: null,
    isLoading: false,
    isError: false,
    isSuccess: false,
  })

  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      // Cancel any pending request on unmount
      abortControllerRef.current?.abort()
    }
  }, [])

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      // Cancel previous request
      abortControllerRef.current?.abort()
      abortControllerRef.current = new AbortController()

      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      let lastError: Error | null = null
      let attempts = 0

      while (attempts <= maxRetries) {
        try {
          const result = await apiFunction(...args)

          if (!isMountedRef.current) return null

          setState({
            data: result,
            error: null,
            isLoading: false,
            isError: false,
            isSuccess: true,
          })

          onSuccess?.(result)
          return result
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err))
          attempts++

          if (attempts <= maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay * attempts))
          }
        }
      }

      // All retries exhausted
      if (!isMountedRef.current) return null

      const error = lastError!

      setState({
        data: null,
        error,
        isLoading: false,
        isError: true,
        isSuccess: false,
      })

      // Report to Sentry
      if (reportToSentry) {
        Sentry.withScope((scope) => {
          if (context) {
            scope.setTag('api_context', context)
          }
          scope.setExtra('arguments', args)
          scope.setExtra('attempts', attempts)
          Sentry.captureException(error)
        })
      }

      onError?.(error)
      return null
    },
    [apiFunction, reportToSentry, maxRetries, retryDelay, onSuccess, onError, context]
  )

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
      isError: false,
      isSuccess: false,
    })
  }, [])

  return {
    execute,
    reset,
    data: state.data,
    error: state.error,
    isLoading: state.isLoading,
    isError: state.isError,
    isSuccess: state.isSuccess,
  }
}
