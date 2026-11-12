import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/shared/utils/supabase/middleware'

/**
 * Next.js 16 Proxy (formerly Middleware)
 *
 * As of Next.js 16, the `middleware.ts` convention has been renamed to `proxy.ts`.
 * This function handles Supabase session updates and token refreshing for all
 * matched routes, ensuring authentication state is persisted across requests.
 *
 * For the root path `/`, it additionally checks auth state and redirects to
 * `/library` (authenticated) or `/login` (unauthenticated or error).
 *
 * @see https://nextjs.org/docs/messages/middleware-to-proxy
 */
export const ALLOWED_ORIGINS = new Set([
  'https://audiobookphile.app',
  'https://www.audiobookphile.app',
  'https://app.audiobookphile.app',
  'https://api.audiobookphile.app',
  'https://audiobookphile.vercel.app',
  'https://audiobookphile.foodshare.club',
])

export const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.audiobookphile\.app$/i,
  /^https:\/\/audiobookphile-[a-z0-9-]+\.vercel\.app$/i,
  /^https:\/\/audiobookphile-[a-z0-9-]+\.foodshare\.club$/i,
  /^http:\/\/localhost:\d+$/i,
  /^http:\/\/127\.0\.0\.1:\d+$/i,
]

export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false
  if (ALLOWED_ORIGINS.has(origin)) return true
  return ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin))
}

export async function proxy(request: NextRequest) {
  // Handle Preflight OPTIONS requests globally for cross-platform apps.
  // Validate request origin against allowed list so untrusted origins are
  // rejected, and set Access-Control-Allow-Credentials only for trusted origins.
  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('origin')
    const allowed = isOriginAllowed(origin)

    if (origin && !allowed) {
      return new NextResponse(null, { status: 403 })
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        ...(origin && allowed
          ? {
              'Access-Control-Allow-Origin': origin,
              'Access-Control-Allow-Credentials': 'true',
            }
          : {}),
        Vary: 'Origin',
        'Access-Control-Allow-Methods': 'GET,DELETE,PATCH,POST,PUT,OPTIONS',
        'Access-Control-Allow-Headers':
          'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
      },
    })
  }

  // If Supabase env vars are missing, skip session update and redirect root to /login
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (request.nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.nextUrl.origin))
    }
    return NextResponse.next()
  }

  // Intercept Audiobookphile mobile app login requests (exclude Next.js Server Actions)
  if (request.nextUrl.pathname === '/login' && request.method === 'POST' && !request.headers.has('next-action')) {
    return NextResponse.rewrite(new URL('/api/login', request.url))
  }

  const response = await updateSession(request)

  const pathname = request.nextUrl.pathname

  // Single Supabase client for all auth checks below (was constructed twice —
  // once for /settings/* and again for /). Cookie reads are cheap but each
  // construction re-parses env + allocates; share one per request.
  const getSupabase = () =>
    createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          // Read-only in this context — session writes handled by updateSession above
        },
      },
    })

  // Two-factor settings (incl. passkey enrollment) are available to all
  // authenticated users; every other /settings page requires admin/root.
  if (pathname === '/settings' || pathname.startsWith('/settings/')) {
    if (pathname === '/settings/authentication') {
      return response
    }
    try {
      const supabase = getSupabase()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.redirect(new URL('/login', request.nextUrl.origin))
      }
      const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', user.id).maybeSingle()
      const type = profile?.user_type
      if (type !== 'admin' && type !== 'root') {
        return NextResponse.redirect(new URL('/library', request.nextUrl.origin))
      }
    } catch {
      return NextResponse.redirect(new URL('/library', request.nextUrl.origin))
    }
  }

  if (pathname !== '/') {
    return response
  }

  // Root path: determine auth state and redirect accordingly
  try {
    const supabase = getSupabase()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const dest = user ? '/library' : '/login'
    return NextResponse.redirect(new URL(dest, request.nextUrl.origin))
  } catch {
    return NextResponse.redirect(new URL('/login', request.nextUrl.origin))
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

export { proxy as middleware }
export default proxy
