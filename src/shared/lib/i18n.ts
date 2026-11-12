import { cookies } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'
import { TIME_ZONE } from './timeZone'

export default getRequestConfig(async () => {
  // Read locale from cookies with priority:
  // 1. userLanguage (user's personal preference)
  // 2. language (server default)
  // 3. 'en-us' (hardcoded fallback)
  const cookieStore = await cookies()
  const userLanguage = cookieStore.get('userLanguage')?.value
  const serverLanguage = cookieStore.get('language')?.value
  const locale = userLanguage || serverLanguage || 'en-us'

  // Always load English as fallback
  const fallbackMessages = (await import(`../../locales/en-us.json`)).default

  // Load the requested locale messages
  let messages = fallbackMessages
  if (locale !== 'en-us') {
    try {
      const localeMessages = (await import(`../../locales/${locale}.json`)).default
      // Merge locale messages on top of fallback, so missing keys use English
      messages = { ...fallbackMessages, ...localeMessages }
    } catch {
      console.warn(`Failed to load messages for locale '${locale}', using en-us fallback`)
      messages = fallbackMessages
    }
  }

  return {
    locale,
    messages,
    // next-intl v4 requires a time zone, and it warns on the server when
    // there is no global default -- which it did on every render, because
    // the client providers in this app do not pass one either. The warning
    // is next-intl saying that the server render and the browser render may
    // disagree, which React reports as a hydration mismatch.
    //
    // See src/shared/lib/timeZone.ts for why a fixed zone is the only safe
    // default, and why UTC.
    timeZone: TIME_ZONE,
  }
})
