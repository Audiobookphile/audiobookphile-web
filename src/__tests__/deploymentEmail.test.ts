import { describe, expect, test } from 'bun:test'
import {
  buildDeploymentEmailHtml,
  buildDeploymentEmailText,
  buildMobileConnectDeepLink,
  sendDeploymentWelcomeEmail,
} from '../shared/lib/email/deploymentEmail'

describe('buildMobileConnectDeepLink', () => {
  test('constructs basic deep link with server and username', () => {
    const link = buildMobileConnectDeepLink('https://audiobookphile.app', 'testadmin')
    expect(link).toContain('audiobookphile://connect?')
    expect(link).toContain('server=https%3A%2F%2Faudiobookphile.app')
    expect(link).toContain('username=testadmin')
    expect(link).not.toContain('password=')
  })

  test('normalizes trailing slashes on server URL', () => {
    const link = buildMobileConnectDeepLink('https://audiobookphile.app///', 'testadmin')
    expect(link).toContain('server=https%3A%2F%2Faudiobookphile.app')
    expect(link).not.toContain('audiobookphile.app%2F')
  })

  test('embeds credentials and autoLogin flag when password provided', () => {
    const link = buildMobileConnectDeepLink(
      'https://my-server.com',
      'owner@example.com',
      'SecretPassword123!',
      true
    )
    expect(link).toContain('server=https%3A%2F%2Fmy-server.com')
    expect(link).toContain('username=owner%40example.com')
    expect(link).toContain('password=SecretPassword123%21')
    expect(link).toContain('autoLogin=1')
  })

  test('omits password when autoLogin is false', () => {
    const link = buildMobileConnectDeepLink(
      'https://my-server.com',
      'owner@example.com',
      'SecretPassword123!',
      false
    )
    expect(link).not.toContain('password=')
    expect(link).not.toContain('autoLogin=')
  })
})

describe('buildDeploymentEmailHtml', () => {
  test('renders executive Liquid Glass HTML email with deep link and credentials', () => {
    const html = buildDeploymentEmailHtml({
      to: 'owner@example.com',
      username: 'rootowner',
      serverUrl: 'https://my-audiobooks.app',
      password: 'StrongPassword99!',
    })

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('audiobookphile')
    expect(html).toContain('Deployment Successful')
    expect(html).toContain('https://my-audiobooks.app')
    expect(html).toContain('rootowner')
    expect(html).toContain('owner@example.com')
    expect(html).toContain('audiobookphile://connect?')
    expect(html).toContain('Connect Audiobookphile iOS Client')
    expect(html).toContain('Next Step: Map Your Native iOS Client')
  })
})

describe('buildDeploymentEmailText', () => {
  test('renders plaintext email with all credentials and instructions', () => {
    const text = buildDeploymentEmailText({
      to: 'owner@example.com',
      username: 'rootowner',
      serverUrl: 'https://my-audiobooks.app',
    })

    expect(text).toContain('AUDIOBOOKPHILE — SERVER DEPLOYMENT READY')
    expect(text).toContain('https://my-audiobooks.app')
    expect(text).toContain('rootowner')
    expect(text).toContain('audiobookphile://connect?')
    expect(text).toContain('Download the Audiobookphile iOS app')
  })
})

describe('sendDeploymentWelcomeEmail', () => {
  test('defaults to console-dev transport in audit/test mode', async () => {
    const originalResend = process.env.RESEND_API_KEY
    const originalSendGrid = process.env.SENDGRID_API_KEY
    const originalPostmark = process.env.POSTMARK_SERVER_TOKEN
    delete process.env.RESEND_API_KEY
    delete process.env.SENDGRID_API_KEY
    delete process.env.POSTMARK_SERVER_TOKEN

    try {
      const result = await sendDeploymentWelcomeEmail({
        to: 'tester@example.com',
        username: 'tester',
        serverUrl: 'https://demo.audiobookphile.app',
      })

      expect(result.success).toBe(true)
      expect(result.transport).toBe('console-dev')
      expect(result.recipient).toBe('tester@example.com')
      expect(result.serverUrl).toBe('https://demo.audiobookphile.app')
      expect(result.deepLink).toContain('audiobookphile://connect?')
    } finally {
      if (originalResend) process.env.RESEND_API_KEY = originalResend
      if (originalSendGrid) process.env.SENDGRID_API_KEY = originalSendGrid
      if (originalPostmark) process.env.POSTMARK_SERVER_TOKEN = originalPostmark
    }
  })
})

