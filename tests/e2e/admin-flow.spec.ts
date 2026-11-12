import { test, expect } from './fixtures'

/**
 * P3.2 — full admin flow smoke.
 *
 * Runs against the live environment (NEXT_PUBLIC_SITE_URL, default localhost
 * port 3000). Requires seeded test credentials in env:
 *   PLAYWRIGHT_ADMIN_EMAIL / PLAYWRIGHT_ADMIN_PASSWORD
 *   PLAYWRIGHT_MEMBER_EMAIL / PLAYWRIGHT_MEMBER_PASSWORD
 * Skipped (soft) when credentials are absent so CI without seeds stays green.
 */

test.describe('admin flow (seeded credentials required)', () => {
  test('admin logs in and sees analytics grid + invite panel on /admin', async ({ adminPage }) => {
    await adminPage.goto('/admin')
    await expect(adminPage.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible()
    await expect(adminPage.getByRole('heading', { name: 'System Analytics' })).toBeVisible()
    // Telemetry grid renders (real values or "—", never fabricated numbers).
    await expect(adminPage.getByRole('heading', { name: 'Total Users' })).toBeVisible()
    // Invite panel is present for admins.
    await expect(adminPage.locator('#invite-email')).toBeVisible()
    await expect(adminPage.getByRole('heading', { name: 'Invite User' })).toBeVisible()
  })

  test('member is redirected away from /admin and /settings/analytics', async ({ memberPage }) => {
    await memberPage.goto('/admin')
    await memberPage.waitForURL((url) => !url.pathname.startsWith('/admin'))

    await memberPage.goto('/settings/analytics')
    await memberPage.waitForURL((url) => !url.pathname.startsWith('/settings/analytics'))

    // Member can never reach the invite panel.
    await expect(memberPage.locator('#invite-email')).toHaveCount(0)
  })
})
