import { ApiError, NetworkError, UnauthorizedError } from '../apiErrors'
import { type ApiResult, fetchAsResult, getServerBaseUrl } from './base'

/**
 * Browser-only authenticated API request — non-throwing (P2.2): returns
 * `{ ok: true, data }` or `{ ok: false, error }`, never throws for HTTP
 * errors and never logs them. Client components read `.ok` explicitly.
 * Never import src/shared/utils/supabase/server from this module: it pulls
 * next/headers into the client bundle and breaks Turbopack builds.
 */
export async function apiFetch<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  const baseUrl = getServerBaseUrl()
  const url = `${baseUrl}${endpoint}`

  const fetchHeaders = new Headers(options.headers)

  if (!(options.body instanceof FormData) && !fetchHeaders.has('Content-Type')) {
    fetchHeaders.set('Content-Type', 'application/json')
  }

  if (!fetchHeaders.has('apikey') && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    fetchHeaders.set('apikey', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  }

  const { createClient } = await import('@/shared/utils/supabase/client')
  const supabase = createClient()

  const { data: sessionData } = await supabase.auth.getSession()
  let accessToken = sessionData.session?.access_token ?? null

  if (!accessToken) {
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

  return fetchAsResult<T>(url, { ...options, headers: fetchHeaders })
}

/**
 * Throwing adapter for existing call sites that rely on thrown errors.
 * Same single fetch core; never logs HTTP failures.
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
    if (error instanceof UnauthorizedError || error instanceof ApiError) {
      throw error
    }
    if (error instanceof NetworkError) throw error
    throw new NetworkError('Network error', error)
  }
}
