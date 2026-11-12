'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { Toaster } from 'sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 60s fresh — shelf/library reads are cheap to revalidate but
            // shouldn't refetch on every focus bounce between player/library.
            staleTime: 60 * 1000,
            // Keep unused data 5min so back-navigation is instant.
            gcTime: 5 * 60 * 1000,
            // One retry with backoff for flaky mobile networks; 4xx never retries.
            retry: (failureCount, error) => {
              if (failureCount >= 1) return false
              const status = (error as { status?: number })?.status
              if (status === 401 || status === 403 || status === 404) return false
              return true
            },
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            // v5: route errors through ErrorBoundary instead of hanging suspense.
            throwOnError: false,
          },
          mutations: {
            // No silent retries on writes — uploads/purchases must not double-fire.
            retry: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        richColors
        position="bottom-right"
        closeButton
        expand={true}
        toastOptions={{
          style: {
            background: 'rgba(23, 23, 23, 0.8)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          },
        }}
      />
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
