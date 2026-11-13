import { describe, expect, test } from 'bun:test'
import { isOfficialDemoHost, normalizeHost } from '../shared/lib/demo'

describe('isOfficialDemoHost', () => {
  test('accepts the official demo hosts and their subdomains', () => {
    expect(isOfficialDemoHost('audiobookphile.app')).toBe(true)
    expect(isOfficialDemoHost('www.audiobookphile.app')).toBe(true)
    expect(isOfficialDemoHost('app.audiobookphile.app')).toBe(true)
    expect(isOfficialDemoHost('audiobookphile.vercel.app')).toBe(true)
    expect(isOfficialDemoHost('audiobookphile.foodshare.club')).toBe(true)
    expect(isOfficialDemoHost('AUDIOBOOKPHILE.APP')).toBe(true)
    expect(isOfficialDemoHost('audiobookphile.app:443')).toBe(true)
    expect(isOfficialDemoHost('https://audiobookphile.app/login')).toBe(true)
  })

  test('rejects every other deployment, including Vercel clones', () => {
    expect(isOfficialDemoHost('audiobookphile-web.vercel.app')).toBe(false)
    expect(isOfficialDemoHost('audiobookphile-abc123-team.vercel.app')).toBe(false)
    expect(isOfficialDemoHost('my-audiobooks.vercel.app')).toBe(false)
    expect(isOfficialDemoHost('localhost:3000')).toBe(false)
    expect(isOfficialDemoHost('127.0.0.1')).toBe(false)
    expect(isOfficialDemoHost(null)).toBe(false)
    expect(isOfficialDemoHost('')).toBe(false)
  })

  test('does not accept lookalike domains', () => {
    expect(isOfficialDemoHost('audiobookphile.app.evil.com')).toBe(false)
    expect(isOfficialDemoHost('fakeaudiobookphile.app')).toBe(false)
    expect(isOfficialDemoHost('notaudiobookphile.app')).toBe(false)
  })
})

describe('normalizeHost', () => {
  test('reduces headers, origins, ports, and proxy chains to a hostname', () => {
    expect(normalizeHost('audiobookphile.app')).toBe('audiobookphile.app')
    expect(normalizeHost('audiobookphile.app:443')).toBe('audiobookphile.app')
    expect(normalizeHost('https://audiobookphile.app/auth/callback')).toBe('audiobookphile.app')
    expect(normalizeHost('audiobookphile.app, proxy.internal')).toBe('audiobookphile.app')
    expect(normalizeHost('audiobookphile.app.')).toBe('audiobookphile.app')
  })

  test('returns null for unusable input', () => {
    expect(normalizeHost(null)).toBeNull()
    expect(normalizeHost(undefined)).toBeNull()
    expect(normalizeHost('   ')).toBeNull()
  })
})
