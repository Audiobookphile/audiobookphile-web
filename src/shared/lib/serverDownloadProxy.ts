/**
 * serverDownloadProxy.ts — stub
 *
 * ABS proxy download functionality is not available in the Supabase-backed version.
 * All internal-api download routes return 410 Gone.
 */

import { NextResponse } from 'next/server'

export type SessionRefreshTokens = {
  accessToken: string
  refreshToken: string | null
}

export type BackendDownloadFetchResult =
  | {
      ok: true
      upstream: Response
      refreshedTokens: SessionRefreshTokens | null
    }
  | {
      ok: false
      status: number
      error: string
      refreshedTokens: SessionRefreshTokens | null
    }

export function attachRefreshedSessionCookies(
  response: NextResponse,
  _refreshedTokens: SessionRefreshTokens | null
): NextResponse {
  return response
}

export function respondDownloadProxyFailure(
  _request: unknown,
  result: Extract<BackendDownloadFetchResult, { ok: false }>
): NextResponse {
  return NextResponse.json({ error: result.error }, { status: result.status })
}

export async function fetchBackendDownloadWithCookieRefresh(
  _backendUrl: string,
  _cookieStore: unknown
): Promise<BackendDownloadFetchResult> {
  console.warn(
    '[serverDownloadProxy] fetchBackendDownloadWithCookieRefresh is not available in the Supabase-backed version'
  )
  return { ok: false, status: 410, error: 'Not available', refreshedTokens: null }
}
