/**
 * Library resilience e2e — guards the /library/books crash class.
 *
 * Covers:
 * - Happy-path shelf render (no error boundary / "Something went wrong")
 * - Slug-based entity pages (no invalid-uuid backend 500)
 * - Client-side resilience when filter/bookshelf APIs return malformed payloads
 * - Error-boundary recovery actions when a forced client failure occurs
 *
 * Requires PLAYWRIGHT_ADMIN_* credentials; the fixture fails closed when absent.
 */
import { expect, test } from './fixtures'

// Resilience suite targets render crashes / recovery, not a11y regressions.
// The auto-axe fixture is disabled here so pre-existing WCAG issues on the
// library chrome do not block the crash-class gate.
test.use({ axeEnabled: false })

test.describe.configure({ mode: 'serial' })

const ERROR_HEADING = 'Something went wrong'
const COPY_DIAG = 'Copy diagnostics'

/** Navigate without hanging on long-poll / analytics sockets that never idle. */
async function gotoStable(page: import('@playwright/test').Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForLoadState('load', { timeout: 15_000 }).catch(() => {})
}

async function expectNoErrorBoundary(page: import('@playwright/test').Page) {
  await expect(page.getByRole('heading', { name: ERROR_HEADING })).toHaveCount(0)
  await expect(page.getByRole('button', { name: COPY_DIAG })).toHaveCount(0)
}

test.describe('library resilience', () => {
  test('/library/books renders shelves without error boundary', async ({ adminPage }) => {
    const pageErrors: string[] = []
    adminPage.on('pageerror', (err) => pageErrors.push(err.message))

    await gotoStable(adminPage, '/library/books')

    await expectNoErrorBoundary(adminPage)
    await expect(adminPage.locator('body')).toBeVisible()
    expect(pageErrors.filter((m) => m.includes("reading 'map'"))).toEqual([])
  })

  test('entity pages resolve slug and do not 500 on library id', async ({ adminPage }) => {
    test.setTimeout(120_000)
    const uuidErrors: string[] = []
    adminPage.on('response', (res) => {
      if (res.status() >= 500) uuidErrors.push(`${res.status()} ${res.url()}`)
    })

    for (const path of [
      '/library/books/items',
      '/library/books/series',
      '/library/books/authors',
      '/library/books/collections',
      '/library/books/playlists',
    ]) {
      await gotoStable(adminPage, path)
      await expectNoErrorBoundary(adminPage)
    }

    // Series detail (slug library + series id) — historically 500'd when the
    // raw slug was passed as libraryId to getSeries/getLibraryItems.
    const seriesLink = adminPage.locator('a[href*="/library/books/series/"]').first()
    if (await seriesLink.count()) {
      await seriesLink.click()
      await adminPage.waitForLoadState('load', { timeout: 15_000 }).catch(() => {})
      await expectNoErrorBoundary(adminPage)
      expect(adminPage.url()).toContain('/library/books/series/')
    }

    expect(uuidErrors.filter((line) => line.includes('invalid input syntax'))).toEqual([])
    expect(uuidErrors.filter((line) => /\/libraries\/books\//.test(line))).toEqual([])
  })

  test('filter data with missing arrays does not crash bookshelf', async ({ adminPage }) => {
    // Server action / edge filterdata returning undefined collections —
    // LibraryFilterSelect and friends must tolerate it.
    await adminPage.route('**/filterdata*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          authors: null,
          series: undefined,
          genres: null,
          tags: null,
          narrators: null,
          publishers: null,
          languages: null,
          publishedDecades: null,
        }),
      })
    })

    await gotoStable(adminPage, '/library/books/items')
    await expectNoErrorBoundary(adminPage)
  })

  test('personalized payload with shelf missing entities does not crash client', async ({ adminPage }, testInfo) => {
    // Intercept browser-side personalized fetches if any occur (soft nav /
    // refetch). SSR fetch cannot be intercepted — covered by unit guards.
    let intercepted = 0
    await adminPage.route('**/personalized*', async (route) => {
      intercepted += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'continue-listening', label: 'Continue Listening', type: 'book' },
          { id: 'recent', label: 'Recently Added', type: 'book', entities: null },
          { id: 'bad', label: 'Bad', type: 'series', entities: undefined },
        ]),
      })
    })

    await gotoStable(adminPage, '/library/books')
    await expectNoErrorBoundary(adminPage)

    // Soft-navigate to force client RSC fetch through the route handler.
    const itemsLink = adminPage.locator('a[href*="/library/books/items"]').first()
    if (await itemsLink.count()) {
      await itemsLink.click()
      await adminPage.waitForLoadState('load', { timeout: 15_000 }).catch(() => {})
      await expectNoErrorBoundary(adminPage)
    }

    testInfo.annotations.push({ type: 'intercepted-personalized', description: String(intercepted) })
  })

  test('error recovery: Go Home leaves a broken library route', async ({ adminPage }) => {
    // Force a client crash by breaking a critical chunk dependency via a
    // route that returns invalid JS for the shelf widget only when the
    // query flag is present — simpler: throw during hydration by injecting
    // a one-shot error from the server action the page depends on.
    let failOnce = true
    await adminPage.route('**/personalized*', async (route) => {
      if (failOnce) {
        failOnce = false
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: { message: 'boom' } }),
        })
        return
      }
      await route.continue()
    })

    await gotoStable(adminPage, '/library/books')

    // If the error boundary rendered, recovery must leave the route.
    const heading = adminPage.getByRole('heading', { name: ERROR_HEADING })
    if (await heading.count()) {
      await expect(adminPage.getByRole('button', { name: 'Try Again' })).toBeVisible()
      await adminPage.getByRole('button', { name: 'Go Home' }).click()
      await adminPage.waitForURL((url) => !url.pathname.includes('/library/books'), { timeout: 15_000 })
      expect(adminPage.url()).not.toContain('/library/books')
    } else {
      // Crash is fixed for this payload — page still healthy.
      await expectNoErrorBoundary(adminPage)
    }
  })

  test('unknown library slug redirects home instead of crashing', async ({ adminPage }) => {
    await gotoStable(adminPage, '/library/definitely-not-a-library-xyz')
    await expectNoErrorBoundary(adminPage)

    // The redirect is async: the route resolves the slug server-side and then
    // replaces the URL client-side. `gotoStable` returns at domcontentloaded,
    // so asserting the URL immediately races that resolve and failed
    // intermittently on a cold dev server — a red run that said nothing about
    // the product. Poll instead, and say what was left on screen if it never
    // redirects.
    await expect
      .poll(() => adminPage.url(), {
        timeout: 15_000,
        message: 'an unknown library slug should redirect away from /library/<bogus>, but stayed put',
      })
      .not.toContain('definitely-not-a-library-xyz')
  })

  test('library controls render real icons and cover sizing stays usable at boundaries', async ({ adminPage }) => {
    test.setTimeout(90_000)

    await gotoStable(adminPage, '/library/books/items')
    await expectNoErrorBoundary(adminPage)

    const moreButton = adminPage.locator('button[aria-label="More options"]:visible').first()
    await expect(moreButton).toBeVisible()
    await expect(moreButton.locator('svg')).toHaveCount(1)

    const coverSizeGroup = adminPage.getByRole('group', { name: 'Cover Size' })
    await expect(coverSizeGroup).toBeVisible()
    const increase = coverSizeGroup.getByRole('button', { name: 'Increase Cover Size' })
    const decrease = coverSizeGroup.getByRole('button', { name: 'Decrease Cover Size' })
    const value = coverSizeGroup.locator('[aria-live="polite"]')
    const initialValue = await value.textContent()

    for (let index = 0; index < 10; index += 1) {
      if (await increase.isDisabled()) break
      await increase.focus()
      await increase.press('Enter')
      await adminPage.waitForTimeout(50)
    }
    await expect(increase).toBeDisabled()
    await expect(value).not.toHaveText(initialValue ?? '')

    await decrease.click()
    await expect(value).not.toHaveText('')
    await expect(decrease).toBeVisible()
    await expect.poll(async () => increase.isEnabled()).toBe(true)

    const increaseBox = await increase.boundingBox()
    expect(increaseBox?.width ?? 0).toBeGreaterThanOrEqual(32)
    expect(increaseBox?.height ?? 0).toBeGreaterThanOrEqual(32)
  })

  test('admin edit pen exposes delete with confirm and cancel is non-destructive', async ({ adminPage }) => {
    await gotoStable(adminPage, '/library/books/items')
    await expectNoErrorBoundary(adminPage)

    const firstCard = adminPage.locator('[cy-id="MediaCard"]').first()
    await expect(firstCard).toBeVisible({ timeout: 20_000 })
    await firstCard.hover()

    const deleteRequests: string[] = []
    adminPage.on('request', (request) => {
      if (request.method() === 'DELETE' && request.url().includes('/api/items/')) {
        deleteRequests.push(request.url())
      }
    })

    const editButton = adminPage.getByRole('button', { name: 'Edit', exact: true }).first()
    await expect(
      editButton,
      'No "Edit" button rendered on any media card. The edit affordance is gated on userCanUpdate, which UserContext derives from profile.user_type (admin|root) — so this almost always means PLAYWRIGHT_ADMIN_EMAIL is signed in as a non-admin profile. Verify with: select username,user_type from profiles where username = \'<PLAYWRIGHT_ADMIN_EMAIL>\''
    ).toBeVisible({ timeout: 30_000 })
    await editButton.click()

    const deleteButton = adminPage.getByRole('button', { name: 'Delete', exact: true }).first()
    await expect(deleteButton).toBeVisible({ timeout: 15_000 })
    await deleteButton.click()

    await expect(adminPage.getByText('Also delete from the file system')).toBeVisible({ timeout: 10_000 })
    await adminPage.getByRole('button', { name: 'Cancel', exact: true }).click()

    await expect(deleteButton).toBeVisible()
    expect(deleteRequests).toEqual([])
  })
})
