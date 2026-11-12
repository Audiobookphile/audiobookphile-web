import { cookies } from 'next/headers'

/**
 * The themes the application ships.
 *
 * The theme arrives from a cookie, which is user-controlled and is not
 * validated, so the honest type is `string`. The set below is what the app
 * actually uses -- `set-theme` only ever writes 'light', 'dark' or 'black',
 * and 'system' is the default -- and it is what the stylesheet styles.
 *
 * This used to be written as
 * `'system' | 'light' | 'dark' | 'black' | string`, which reads as a
 * constraint and is not one: the trailing `string` absorbs the other three,
 * so any value was accepted. The union was documentation pretending to be a
 * type.
 */
export type ThemeName = string

export const DEFAULT_THEME: ThemeName = 'system'

/**
 * Get the current theme from cookies (server-side)
 * Returns the theme cookie value or the default theme
 */
export async function getTheme(): Promise<ThemeName> {
  const cookieStore = await cookies()
  const theme = cookieStore.get('theme')?.value
  return theme || DEFAULT_THEME
}
