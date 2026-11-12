import { NextResponse } from 'next/server'
import { getSupabaseAnonKey } from '@/shared/utils/supabase/env'
import { ApiError, NetworkError, UnauthorizedError } from '../apiErrors'
import { type ApiResult, fetchAsResult, getClientBaseUrlFromRequest, getServerBaseUrl } from './base'

/**
 * Send the browser to /login with an error hint and drop refresh cookie (session cannot continue).
 */
export function redirectToLogin(request: Request, errorMessage: string): NextResponse {
  const login = new URL('/login', getClientBaseUrlFromRequest(request))
  login.searchParams.set('error', errorMessage)
  const response = NextResponse.redirect(login)
  response.cookies.delete('refresh_token')
  return response
}

/**
 * User "Home" page is the default library page, or settings/account page if no libraries are set yet
 */
export function getUserDefaultUrlPath(userDefaultLibraryId: string | null, userType: string) {
  const isAdmin = ['admin', 'root'].includes(userType)
  return userDefaultLibraryId ? `/library/${userDefaultLibraryId}` : isAdmin ? '/settings' : '/account'
}

const publicEndpoints = ['/status']

/**
 * Single authenticated fetch layer (P2.2). Never throws for HTTP or network
 * errors — returns `{ ok: true, data }` or `{ ok: false, error }`; server
 * components read `.ok` explicitly. Use this for data reads.
 *
 * On 401 (or missing access token with a refresh cookie), exchanges the refresh
 * token for new session tokens, updates Next.js cookies when possible, and
 * retries once. Server actions return updated cookies to the browser.
 */
export async function apiFetch<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  const isPublic = publicEndpoints.includes(endpoint)
  const baseUrl = getServerBaseUrl()
  const url = `${baseUrl}${endpoint}`

  const isFormData = options.body instanceof FormData

  const fetchHeaders = new Headers(options.headers)

  if (!isFormData && !fetchHeaders.has('Content-Type')) {
    fetchHeaders.set('Content-Type', 'application/json')
  }

  const anonKey = getSupabaseAnonKey()
  if (!fetchHeaders.has('apikey') && anonKey) {
    fetchHeaders.set('apikey', anonKey)
  }

  if (!isPublic) {
    const { createClient } = await import('@/shared/utils/supabase/server')
    const supabase = await createClient()

    // First try to get the active session locally
    const { data: sessionData } = await supabase.auth.getSession()

    let accessToken: string | null = sessionData.session?.access_token ?? null

    if (!accessToken) {
      // Fallback to getUser which forces a refresh if the token is expired
      const { data: userData } = await supabase.auth.getUser()
      if (userData.user) {
        const { data: refreshedSession } = await supabase.auth.getSession()
        accessToken = refreshedSession.session?.access_token ?? null
      }
    }

    if (!accessToken) {
      return {
        ok: false,
        error: {
          type: 'unauthorized',
          status: 401,
          statusText: 'Unauthorized',
          message: 'No authentication token found',
        },
      }
    }

    fetchHeaders.set('Authorization', `Bearer ${accessToken}`)
  }

  return fetchAsResult<T>(url, { ...options, headers: fetchHeaders })
}

/**
 * Throwing adapter for mutation call sites (server actions etc.) that need
 * thrown errors for control flow. Same single fetch core; never logs HTTP
 * failures.
 */
export async function apiRequest<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    const result = await apiFetch<T>(endpoint, options)
    if (result.ok) return result.data

    const { error } = result
    if (error.type === 'unauthorized') {
      throw new UnauthorizedError(error.message)
    }
    if (error.type === 'http') {
      throw new ApiError(error.message, error.status, error.statusText)
    }
    throw new NetworkError(error.message, error.cause)
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'digest' in error &&
      typeof error.digest === 'string' &&
      error.digest.includes('NEXT_REDIRECT')
    ) {
      throw error
    }
    if (error instanceof UnauthorizedError || error instanceof ApiError) {
      throw error
    }
    if (error instanceof NetworkError) throw error
    throw new NetworkError('Network error', error)
  }
}

export type SessionRefreshTokens = {
  accessToken: string
  refreshToken: string | null
}

export type SessionRefreshResult = SessionRefreshTokens & {
  userDefaultLibraryId: string | null
  userType: string
}
