import { afterEach, describe, expect, it, vi } from 'bun:test'
import { fetchAsResult } from '@/shared/lib/api/base'

/**
 * P3.3 contract regression — the exact incident shape.
 *
 * During the /admin incident, a 500 from the analytics endpoint was thrown
 * AND console.error'd from the telemetry fetch, producing noisy client logs
 * on every render. The unified fetch core must return the error in the
 * result without throwing or logging.
 */
describe('fetchAsResult (unified non-throwing fetch core)', () => {
  const originalFetch = globalThis.fetch
  const originalError = console.error

  afterEach(() => {
    globalThis.fetch = originalFetch
    console.error = originalError
  })

  it('returns the error result when the endpoint responds 500 — no throw, no console.error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        statusText: 'Internal Server Error',
        headers: { 'content-type': 'application/json' },
      })
    ) as unknown as typeof fetch

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await fetchAsResult<{ totalUsers: number }>('http://edge/api/admin-analytics')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.type).toBe('http')
      expect(result.error.status).toBe(500)
      expect(result.error.message).toContain('Internal Server Error')
    }
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('returns data on 200', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ totalUsers: 3 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    ) as unknown as typeof fetch

    const result = await fetchAsResult<{ totalUsers: number }>('http://edge/api/admin-analytics')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.totalUsers).toBe(3)
  })

  it('maps 401 to the unauthorized error type without throwing', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response('Unauthorized', { status: 401 })) as unknown as typeof fetch

    const result = await fetchAsResult<unknown>('http://edge/api/me')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.type).toBe('unauthorized')
      expect(result.error.status).toBe(401)
    }
  })

  it('maps network failures to the network error type without throwing', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch

    const result = await fetchAsResult<unknown>('http://edge/api/me')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.type).toBe('network')
      expect(result.error.status).toBe(0)
    }
  })

  it('handles empty 204 responses as ok with undefined data', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 })) as unknown as typeof fetch

    const result = await fetchAsResult<void>('http://edge/api/me/progress-batch')

    expect(result.ok).toBe(true)
  })
})
