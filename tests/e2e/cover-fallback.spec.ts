/**
 * Cover fallback e2e — a book with no cover art must render the placeholder
 * without asking the API for a cover that can only 404.
 *
 * ── WHY THIS EXISTS ──
 *
 * `cover_path = 'missing'` is a terminal verdict: the backend already tried the
 * metadata providers and confirmed the work genuinely has no art. The cover
 * endpoint answers that verdict with a JSON 404, and a JSON body in an `<img>`
 * request is blocked by the browser's no-sniff cross-origin check, so every one
 * of those items logged `net::ERR_BLOCKED_BY_ORB` and still cost a request that
 * could never succeed. The client now short-circuits the sentinel to the local
 * placeholder.
 *
 * The short-circuit reads the cover path from `media.coverPath`, because that
 * is where a LibraryItem payload carries it. An earlier version read a
 * top-level `coverPath`, resolved to `undefined` for every real item, and
 * silently did nothing -- while a unit test that hand-built
 * `{ coverPath: 'missing' }` passed the whole time. That is exactly why this
 * test drives a real browser and counts real network requests instead of
 * asserting on a hand-made object.
 *
 * The target is discovered, not hardcoded: the bookshelf is virtualized, so
 * the test scrolls the catalog and takes the first card whose cover is the
 * placeholder -- a book with no art by definition. The item id then comes from
 * the URL the card navigates to.
 */
import { expect, test } from './fixtures'
import { audioElement, gotoStable } from './helpers/playableItem'

test.use({ axeEnabled: false })

/**
 * Scrolls the virtualized bookshelf down one step.
 * Returns false when the container will not scroll further (end of catalog).
 */
async function scrollBookshelfDown(page: import('@playwright/test').Page): Promise<boolean> {
  const card = page.locator('[cy-id="MediaCard"]').first()
  const container = card.locator('xpath=ancestor::div[contains(@class, "overflow-y-auto")][1]')
  const before = await container.evaluate((el) => el.scrollTop)
  await container.evaluate((el) => {
    el.scrollTop += 700
  })
  await page.waitForTimeout(500)
  const after = await container.evaluate((el) => el.scrollTop)
  return after > before
}

/**
 * Finds a shelf card showing the placeholder, i.e. a book with no cover art.
 *
 * The bookshelf virtualizes its rows, so the catalog is walked by scrolling
 * until a card whose cover src is the local placeholder appears. When the
 * container stops scrolling, the whole catalog has been seen and the no-cover
 * path is genuinely untestable against this library.
 */
async function findCoverlessCard(page: import('@playwright/test').Page) {
  for (let step = 0; step < 40; step++) {
    const cards = page.locator('[cy-id="MediaCard"]')
    const count = await cards.count()
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i)
      const src = await card
        .locator('img')
        .first()
        .getAttribute('src')
        .catch(() => null)
      if (src && src.includes('book_placeholder')) return { card, index: i }
    }

    if (!(await scrollBookshelfDown(page))) break
  }
  throw new Error(
    'no card in the catalog renders the placeholder cover: every book in this library claims to have art, ' +
      'so the no-cover fallback path is untestable here'
  )
}

test('a book with no cover art never requests the cover endpoint', async ({ adminPage }) => {
  await gotoStable(adminPage, '/library/books/items')
  await adminPage.locator('[cy-id="MediaCard"]').first().waitFor({ state: 'visible', timeout: 60_000 })

  const { card } = await findCoverlessCard(adminPage)

  // Only count requests made from here on, so the other books fetching their
  // own covers cannot be mistaken for this one asking.
  const coverRequests: string[] = []
  adminPage.on('request', (req) => {
    if (/\/items\/[0-9a-f-]{36}\/cover/.test(req.url())) coverRequests.push(req.url())
  })

  await card.click({ position: { x: 10, y: 10 } })

  // A coverless book is also unplayable, so the click must land as navigation
  // rather than on a hover overlay button.
  await adminPage.waitForURL(/\/item\/[0-9a-f-]{36}/, { timeout: 60_000 })
  const itemId = adminPage.url().match(/\/item\/([0-9a-f-]{36})/)?.[1]
  expect(itemId, `did not land on an item page: ${adminPage.url()}`).toBeTruthy()

  // Give the page time to render everything it is going to request.
  await adminPage.waitForTimeout(4_000)

  const forThisItem = coverRequests.filter((u) => u.includes(itemId!))
  expect(
    forThisItem,
    `the item page requested a cover for a book whose cover_path is the terminal "missing" sentinel: ${forThisItem.join(', ')}`
  ).toHaveLength(0)

  // And nothing may have been OOM-killed or left an audio element behind: this
  // is a book with no audio, so pressing around must not start a session.
  expect(await audioElement(adminPage).count()).toBe(0)
})

test('a book with no cover art shows the placeholder, not a broken image', async ({ adminPage }) => {
  await gotoStable(adminPage, '/library/books/items')
  await adminPage.locator('[cy-id="MediaCard"]').first().waitFor({ state: 'visible', timeout: 60_000 })

  const { card } = await findCoverlessCard(adminPage)
  const src = await card.locator('img').first().getAttribute('src')

  expect(src, 'the coverless card is not pointing at the local placeholder').toContain('book_placeholder')

  // A broken image would leave a zero natural size; the placeholder is a real
  // asset, so the element must have decoded it.
  const naturalWidth = await card
    .locator('img')
    .first()
    .evaluate((el) => (el as HTMLImageElement).naturalWidth)
  expect(naturalWidth, 'the placeholder image itself failed to load').toBeGreaterThan(0)
})
