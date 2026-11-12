'use client'

import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { Suspense } from 'react'
import { TIME_ZONE } from '@/shared/lib/timeZone'

async function LocaleContent({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={TIME_ZONE}>
      {children}
    </NextIntlClientProvider>
  )
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <LocaleContent>{children}</LocaleContent>
    </Suspense>
  )
}
