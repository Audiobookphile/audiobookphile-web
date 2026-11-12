import '@/assets/globals.css'
import type { Metadata } from 'next'
import { getLocale, getMessages } from 'next-intl/server'
import ErrorBoundary from '@/shared/components/ErrorBoundary'
import { LocaleThemeProvider } from '@/shared/components/LocaleThemeProvider'
import { ErrorBoundary as SentryErrorBoundary } from '@/shared/ErrorBoundary'
import { Providers } from '@/shared/Providers'
import { CardSizeProvider } from '../features/library/contexts/CardSizeContext'
import { ToastProvider } from '../shared/contexts/ToastContext'
import { getTheme } from '../shared/lib/theme'

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#f97316',
}

export const metadata: Metadata = {
  title: 'Audiobookphile',
  description: 'A self-hosted audiobook and podcast server',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Audiobookphile',
  },
  openGraph: {
    title: 'Audiobookphile',
    description: 'A self-hosted audiobook and podcast server',
    type: 'website',
  },
}

import { PostHogProvider } from '@/shared/PostHogProvider'
import { ServiceWorkerRegistrar } from '@/shared/ServiceWorkerRegistrar'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const theme = await getTheme()
  const messages = await getMessages()

  return (
    <html lang={locale} className={`theme-${theme}`} data-scroll-behavior="smooth">
      <body className="overflow-hidden" suppressHydrationWarning>
        <div key="providers">
          <PostHogProvider>
            <LocaleThemeProvider initialLocale={locale} initialTheme={theme} initialMessages={messages}>
              <ToastProvider>
                <CardSizeProvider>
                  <SentryErrorBoundary componentName="RootLayout">
                    <ErrorBoundary title="Audiobookphile Error">
                      <Providers>{children}</Providers>
                      <ServiceWorkerRegistrar />
                    </ErrorBoundary>
                  </SentryErrorBoundary>
                </CardSizeProvider>
              </ToastProvider>
            </LocaleThemeProvider>
          </PostHogProvider>
        </div>
      </body>
    </html>
  )
}
