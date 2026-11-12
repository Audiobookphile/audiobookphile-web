import { test, expect } from './fixtures'

test('has title and login options', async ({ page }) => {
  await page.goto('/')

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Audiobookphile/i)

  // Check that the page loads properly
  const locator = page.locator('body')
  await expect(locator).toBeVisible()
})

test('guests are redirected away from /admin (layout-level guard)', async ({ page }) => {
  await page.goto('/admin')
  await page.waitForURL((url) => !url.pathname.startsWith('/admin'))
})

test('guests are redirected away from /settings/analytics (page-level guard)', async ({ page }) => {
  await page.goto('/settings/analytics')
  await page.waitForURL((url) => !url.pathname.startsWith('/settings/analytics'))
})
