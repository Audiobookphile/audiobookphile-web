import { test, expect } from './fixtures'

test.describe('Visual Regressions', () => {
  test('home page matches baseline', async ({ page, makeAxeBuilder }) => {
    await page.goto('/')
    await expect(page.locator('body')).toBeVisible()

    // Hide dynamic elements or wait for stability if needed
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot('home-page-baseline.png', { fullPage: true, maxDiffPixelRatio: 0.05 })

    const results = await makeAxeBuilder().analyze()
    expect(results.violations).toEqual([])
  })
})
