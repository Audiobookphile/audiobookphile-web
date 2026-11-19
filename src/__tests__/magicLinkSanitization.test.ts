import { describe, expect, it } from 'bun:test'

describe('Magic Link Error Sanitization', () => {
  it('translates cryptic GoTrue "Signups not allowed for otp" to user-friendly copy', () => {
    const rawError = 'Signups not allowed for otp'
    const errorLower = rawError.toLowerCase()
    
    let userFacingMessage = rawError
    if (errorLower.includes('signups not allowed') || errorLower.includes('otp')) {
      userFacingMessage =
        'No account was found with this email address. Registration is invitation-only — please contact an administrator for access.'
    }

    expect(userFacingMessage).not.toContain('otp')
    expect(userFacingMessage).toContain('Registration is invitation-only')
  })

  it('detects demo account email and prevents magic link confusion', () => {
    const demoAccount = { username: 'demo@audiobookphile.app', password: 'AudiobookphileDemo2026!' }
    const inputEmail = 'demo@audiobookphile.app'

    const isDemo = inputEmail.trim().toLowerCase() === demoAccount.username.toLowerCase()
    expect(isDemo).toBe(true)

    const message = isDemo
      ? 'The demo account uses password authentication. Please click "Try Demo (1-Click)" or "Sign in" above.'
      : null

    expect(message).toContain('Try Demo (1-Click)')
  })
})
