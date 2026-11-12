import { describe, expect, test } from 'bun:test'
import { NextRequest } from 'next/server'
import { isOriginAllowed, proxy } from '../proxy'

describe('CORS Origin Validation', () => {
  test('allows production domains and subdomains', () => {
    expect(isOriginAllowed('https://audiobookphile.app')).toBe(true)
    expect(isOriginAllowed('https://www.audiobookphile.app')).toBe(true)
    expect(isOriginAllowed('https://app.audiobookphile.app')).toBe(true)
    expect(isOriginAllowed('https://api.audiobookphile.app')).toBe(true)
    expect(isOriginAllowed('https://custom.audiobookphile.app')).toBe(true)
  })

  test('allows preview and dev origins', () => {
    expect(isOriginAllowed('https://audiobookphile.vercel.app')).toBe(true)
    expect(isOriginAllowed('https://audiobookphile-pr-123.vercel.app')).toBe(true)
    expect(isOriginAllowed('http://localhost:3000')).toBe(true)
    expect(isOriginAllowed('http://localhost:8080')).toBe(true)
    expect(isOriginAllowed('http://127.0.0.1:3000')).toBe(true)
  })

  test('rejects malicious or unauthorized origins', () => {
    expect(isOriginAllowed('https://evil.com')).toBe(false)
    expect(isOriginAllowed('https://attacker.audiobookphile.app.evil.com')).toBe(false)
    expect(isOriginAllowed('http://audiobookphile.app')).toBe(false) // insecure HTTP
    expect(isOriginAllowed('https://fakeaudiobookphile.app')).toBe(false)
    expect(isOriginAllowed('')).toBe(false)
    expect(isOriginAllowed(null)).toBe(false)
  })

  test('OPTIONS preflight allows trusted origin with credentials', async () => {
    const req = new NextRequest('https://audiobookphile.app/api/health', {
      method: 'OPTIONS',
      headers: {
        origin: 'https://audiobookphile.app',
      },
    })
    const res = await proxy(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://audiobookphile.app')
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  })

  test('OPTIONS preflight returns 403 for untrusted origin', async () => {
    const req = new NextRequest('https://audiobookphile.app/api/health', {
      method: 'OPTIONS',
      headers: {
        origin: 'https://evil.com',
      },
    })
    const res = await proxy(req)
    expect(res.status).toBe(403)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })
})
