import { describe, expect, test } from 'bun:test'
import { POST } from '@/app/api/setup/email-connect/route'

describe('POST /api/setup/email-connect', () => {
  test('returns 400 when email is missing or empty', async () => {
    const req = new Request('http://localhost:3000/api/setup/email-connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.ok).toBe(false)
    expect(data.error).toContain('valid email address is required')
  })

  test('returns 400 when email is invalid format', async () => {
    const req = new Request('http://localhost:3000/api/setup/email-connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.ok).toBe(false)
  })

  test('returns 200 with deep link when valid email is provided', async () => {
    const req = new Request('http://localhost:3000/api/setup/email-connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'tester@example.com',
        serverUrl: 'https://mybooks.selfhosted.org',
        includeDemoCredentials: true,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.message).toContain('tester@example.com')
    expect(data.deepLink).toContain('audiobookphile://connect')
    expect(data.deepLink).toContain('server=https%3A%2F%2Fmybooks.selfhosted.org')
    expect(data.deepLink).toContain('autoLogin=1')
  })
})
