import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { getSupabaseAnonKey, getSupabaseUrl } from './env'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

          // Manually sync cookie header for downstream Server Actions
          request.headers.set(
            'cookie',
            request.cookies
              .getAll()
              .map((c) => `${c.name}=${c.value}`)
              .join('; ')
          )

          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  // Verifying the token, and refreshing it when it needs refreshing.
  //
  // This runs on every request: every page, every API proxy call, every
  // client navigation, every image. `getUser()` validates the token with
  // the Supabase auth server, so it is a network round trip -- to the auth
  // server, on every request, for a token that is almost always perfectly
  // valid.
  //
  // `getClaims()` verifies the same token locally, against the signing key
  // discovery endpoint, which is cached; and the session behind it is only
  // refreshed when it has actually expired -- which is the refresh this
  // middleware is here to do. The refresh writes through the same cookie
  // adapter, so the renewed session still lands in the response.
  //
  // For a project signing with a symmetric secret, `getClaims()` falls back
  // to `getUser()`, so this is never worse than it was.
  await supabase.auth.getClaims()

  // Set default theme cookie if missing
  const themeCookie = request.cookies.get('theme')?.value
  if (!themeCookie) {
    supabaseResponse.cookies.set('theme', 'system', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 365 * 24 * 60 * 60, // 1 year
    })
  }

  // Pass the current path to server components via header
  const { pathname, search } = request.nextUrl
  supabaseResponse.headers.set('x-current-path', pathname + search)

  return supabaseResponse
}
