/**
 * Isomorphic API helpers: no next/* imports (safe for client bundles).
 */
export function getServerBaseUrl() {
  const isServer = typeof window === 'undefined'

  // On the server, bypass Vercel's Edge Router (loopback fetch) to prevent it from dropping
  // Authorization headers and throwing 401 Unauthorized loops.
  if (isServer && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
  }

  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`

  let host = process.env.HOST || 'localhost'
  if (host === '0.0.0.0') {
    // Convert "all interfaces" address to localhost for internal API calls
    host = 'localhost'
  }
  return `http://${host}:${process.env.PORT || '3333'}`
}

/**
 * Client-facing origin from request headers (for redirects out of internal API routes).
 * The server may use an internal hostname; the browser must be sent to the URL it used.
 */
export function getClientBaseUrlFromRequest(request: Request): string {
  const headers = new Headers(request.headers)
  const host = headers.get('x-forwarded-host') || headers.get('host') || 'localhost'
  const protocol =
    headers.get('x-forwarded-proto') || (host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https') // dev-only fallback
  return `${protocol}://${host}`
}

export async function parseApiResponseBody<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type')
  const contentLength = response.headers.get('content-length')

  if (response.status === 204 || contentLength === '0') {
    return undefined as T
  }

  if (contentType?.includes('application/json')) {
    const data = await response.json()
    return data as T
  }

  const text = await response.text()
  if (!text || text.trim() === '') {
    return undefined as T
  }

  try {
    const data = JSON.parse(text)
    return data as T
  } catch {
    return undefined as T
  }
}

export type ApiErrorType = 'http' | 'unauthorized' | 'network'

export type ApiErrorDetail = {
  type: ApiErrorType
  status: number
  statusText: string
  message: string
  cause?: unknown
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiErrorDetail }

/**
 * Extract a human-readable message from the edge error envelope without
 * breaking callers that assert on the raw text. Handles:
 *   - `{ error: { code, message } }` (standard envelope)
 *   - `{ error: "string" }` (legacy plain errors)
 *   - plain text / HTML error pages
 */
export function extractErrorMessage(text: string): string {
  if (!text) return ''
  try {
    const parsed = JSON.parse(text) as unknown
    if (typeof parsed === 'object' && parsed !== null && 'error' in parsed) {
      const err = parsed.error
      if (typeof err === 'string') return err
      if (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string') {
        return (err as { message: string }).message
      }
    }
  } catch {
    // Not JSON — fall through to raw text.
  }
  return text
}

/**
 * Single non-throwing fetch core (P2.2): never throws for HTTP errors, never
 * logs them either — the incident class was a 500 being both thrown and
 * console.error'd from a telemetry fetch. HTTP errors are returned as
 * `{ ok: false, error }`; callers read `.ok` explicitly.
 */
export async function fetchAsResult<T = unknown>(input: RequestInfo | URL, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const response = await fetch(input, init)

    if (response.status === 401) {
      return {
        ok: false,
        error: {
          type: 'unauthorized',
          status: 401,
          statusText: response.statusText,
          message: 'Unauthorized',
        },
      }
    }

    if (!response.ok) {
      const text = await response.text()
      return {
        ok: false,
        error: {
          type: 'http',
          status: response.status,
          statusText: response.statusText,
          message: extractErrorMessage(text) || `HTTP ${response.status}: ${response.statusText}`,
        },
      }
    }

    const data = await parseApiResponseBody<T>(response)
    return { ok: true, data }
  } catch (cause) {
    return {
      ok: false,
      error: {
        type: 'network',
        status: 0,
        statusText: 'Network error',
        message: 'Network error',
        cause,
      },
    }
  }
}
