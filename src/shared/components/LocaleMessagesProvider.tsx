'use client'

import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { Suspense } from 'react'
import { TIME_ZONE } from '@/shared/lib/timeZone'

async function MessagesProvider({ locale, children }: { locale: string; children: React.ReactNode }) {
  const messages = await getMessages()
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={TIME_ZONE}>
      {children}
    </NextIntlClientProvider>
  )
}

export function LocaleMessagesProvider({ locale, children }: { locale: string; children: React.ReactNode }) {
  return (
    <Suspense fallback={<div>Loading translations...</div>}>
      <MessagesProvider locale={locale}>{children}</MessagesProvider>
    </Suspense>
  )
}
