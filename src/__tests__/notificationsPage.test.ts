import { describe, expect, it } from 'bun:test'
import {
  getNotificationsAction,
  testWebhookAction,
  type CreateNotificationPayload,
} from '@/app/(main)/settings/notifications/actions'

describe('Notifications & Webhook Actions Contract', () => {
  it('returns default fallback webhook target when offline or unconfigured', async () => {
    const notifications = await getNotificationsAction()
    expect(notifications).toBeDefined()
    expect(Array.isArray(notifications)).toBe(true)
    expect(notifications.length).toBeGreaterThanOrEqual(1)

    const first = notifications[0]
    expect(first.name).toBeDefined()
    expect(first.url).toContain('http')
    expect(first.events.length).toBeGreaterThan(0)
  })

  it('correctly constructs CreateNotificationPayload structure', () => {
    const payload: CreateNotificationPayload = {
      name: 'Discord Audio Announcements',
      url: 'https://discord.com/api/webhooks/123/xyz',
      events: ['onItemAdded', 'onItemUpdated'],
      enabled: true,
      authHeader: 'Bearer test-token',
    }

    expect(payload.name).toBe('Discord Audio Announcements')
    expect(payload.events).toContain('onItemAdded')
    expect(payload.enabled).toBe(true)
    expect(payload.authHeader).toBe('Bearer test-token')
  })

  it('testWebhookAction returns valid TestWebhookResult shape', async () => {
    const result = await testWebhookAction({
      url: 'https://example.com/api/webhook/test',
    })

    expect(result).toBeDefined()
    expect(typeof result.success).toBe('boolean')
    expect(typeof result.status).toBe('number')
    expect(result.event).toBe('onTest')
    expect(result.message).toBeDefined()
  })
})

