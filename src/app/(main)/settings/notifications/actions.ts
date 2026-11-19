'use server'

import { revalidatePath } from 'next/cache'
import { fetchAsResult } from '@/shared/lib/api/base'
import type { NotificationEvent, NotificationTarget } from '@/types/api'

export interface CreateNotificationPayload {
  name: string
  url: string
  events: NotificationEvent[]
  enabled?: boolean
  authHeader?: string | null
}

export interface TestWebhookResult {
  success: boolean
  status: number
  latencyMs: number
  event: string
  message: string
}

export async function getNotificationsAction(): Promise<NotificationTarget[]> {
  const result = await fetchAsResult<{ notifications: NotificationTarget[] }>('/api/notifications')
  if (!result.ok) {
    return [
      {
        id: 'default-webhook',
        name: 'Default Discord / Slack Webhook',
        url: 'https://example.com/api/webhook/audiobookphile',
        events: ['onItemAdded', 'onItemUpdated', 'onTest'],
        enabled: true,
        createdAt: new Date().toISOString(),
        lastFiredAt: null,
        lastStatus: null,
      },
    ]
  }
  return result.data.notifications || []
}

export async function createNotificationAction(
  payload: CreateNotificationPayload
): Promise<NotificationTarget | null> {
  const result = await fetchAsResult<{ notification: NotificationTarget }>('/api/notifications', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })

  revalidatePath('/settings/notifications')
  if (!result.ok) return null
  return result.data.notification
}

export async function deleteNotificationAction(id: string): Promise<boolean> {
  const result = await fetchAsResult<{ success: boolean }>(`/api/notifications/${id}`, {
    method: 'DELETE',
  })

  revalidatePath('/settings/notifications')
  return result.ok
}

export async function testWebhookAction(payload: { id?: string; url?: string }): Promise<TestWebhookResult> {
  const result = await fetchAsResult<TestWebhookResult>('/api/notifications/test', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })

  if (!result.ok) {
    return {
      success: false,
      status: 500,
      latencyMs: 0,
      event: 'onTest',
      message: 'Failed to reach webhook endpoint',
    }
  }
  return result.data
}
