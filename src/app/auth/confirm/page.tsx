'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const APP_DEEP_LINK_SCHEME = 'audiobookphile://'

/**
 * Client-side auth confirmation page.
 *
 * GoTrue's implicit (non-PKCE) magic-link / invite / recovery redirects carry
 * the session tokens in the URL *fragment* (`#access_token=...&refresh_token=...`),
 * which is never sent to the server — so no route handler can see them. This
 * page parses the hash in the browser, persists the session, and redirects.
 * PKCE links (token_hash) are handled server-side by /auth/callback.
 */
export default function AuthConfirmPage() {
  const router = useRouter()

  useEffect(() => {
    const rawHash = window.location.hash.substring(1)
    const params = new URLSearchParams(rawHash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')
    const url = new URL(window.location.href)
    const client = url.searchParams.get('client')
    const server = url.searchParams.get('server')
    let next = url.searchParams.get('next') ?? '/'
    if (!next.startsWith('/')) next = '/'

    if (!accessToken || !refreshToken) {
      router.replace('/auth/auth-code-error')
      return
    }

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    void supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ data, error }) => {
        if (error || !data.session) {
          router.replace('/auth/auth-code-error')
          return
        }
        if (client === 'ios') {
          const url = new URL('auth/callback', APP_DEEP_LINK_SCHEME)
          url.searchParams.set('accessToken', data.session.access_token)
          url.searchParams.set('refreshToken', data.session.refresh_token ?? '')
          url.searchParams.set('userId', data.session.user.id)
          if (server) url.searchParams.set('server', server)
          window.location.replace(url.toString())
          return
        }
        const destination = type === 'recovery' ? '/reset-password' : next === '/' ? '/library' : next
        router.replace(destination)
      })
  }, [router])

  return null
}
