'use client'

import { NextIntlClientProvider } from 'next-intl'
import { createContext, useContext, useEffect, useState } from 'react'
import { TIME_ZONE } from '@/shared/lib/timeZone'

type LocaleThemeContextValue = {
  locale: string
  theme: string
  mounted: boolean
}

const LocaleThemeContext = createContext<LocaleThemeContextValue>({
  locale: 'en-us',
  theme: 'system',
  mounted: false,
})

type LocaleThemeProviderProps = {
  children: React.ReactNode
  initialLocale: string
  initialTheme: string
  initialMessages: Record<string, string>
}

export function LocaleThemeProvider({
  children,
  initialLocale,
  initialTheme,
  initialMessages,
}: LocaleThemeProviderProps) {
  const [locale, setLocale] = useState(initialLocale)
  const [theme, setTheme] = useState(initialTheme)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Read locale from cookies
    const userLanguage = document.cookie
      .split('; ')
      .find((row) => row.startsWith('userLanguage='))
      ?.split('=')[1]
    const serverLanguage = document.cookie
      .split('; ')
      .find((row) => row.startsWith('language='))
      ?.split('=')[1]
    const localeFromCookie = userLanguage || serverLanguage || 'en-us'
    setLocale(localeFromCookie)

    // Read theme from cookies
    const themeFromCookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith('theme='))
      ?.split('=')[1]
    setTheme(themeFromCookie || 'system')

    // Apply theme to html element
    document.documentElement.className = `theme-${themeFromCookie || 'system'}`
    document.documentElement.lang = localeFromCookie
  }, [])

  return (
    <LocaleThemeContext.Provider value={{ locale, theme, mounted }}>
      <NextIntlClientProvider locale={locale} messages={initialMessages} timeZone={TIME_ZONE}>
        {mounted ? children : <>{children}</>}
      </NextIntlClientProvider>
    </LocaleThemeContext.Provider>
  )
}

export function useLocaleTheme() {
  return useContext(LocaleThemeContext)
}
