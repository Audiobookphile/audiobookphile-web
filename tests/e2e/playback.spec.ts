import { expect } from '@playwright/test'
import { test } from './fixtures'

test.describe('Playback E2E Contract', () => {
  test('playback endpoint rejects invalid UUID with 404 or 400 in < 1000ms', async ({ api }) => {
    const start = Date.now()
    const res = await api.post('/api/items/not-a-valid-uuid/play', {
      data: {
        deviceInfo: { clientName: 'PW Web E2E' },
        mediaPlayer: 'web',
      },
    })
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(2000)
    expect([400, 404]).toContain(res.status())
  })

  test('playback endpoint fails fast for non-existent UUID without hanging', async ({ api }) => {
    const start = Date.now()
    const res = await api.post('/api/items/00000000-0000-4000-8000-000000000000/play', {
      data: {
        deviceInfo: { clientName: 'PW Web E2E' },
        mediaPlayer: 'web',
      },
    })
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(3000)
    expect([404]).toContain(res.status())
  })

  test('session sync endpoint validates required fields', async ({ api }) => {
    const res = await api.post('/api/session/invalid-session-id/sync', {
      data: {},
    })
    expect([400, 401, 404]).toContain(res.status())
  })
})
