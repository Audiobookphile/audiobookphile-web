/**
 * Shared helpers for the playback e2e guards.
 *
 * Both play-button.spec.ts and playback-progress.spec.ts need to reach a book
 * that genuinely has audio in storage, and they must do it the same way. Only
 * 27 of 100 books in this library have audio; the other 73 are *correctly*
 * rendered without a Play button. So "grab the first card" is flaky by
 * construction, and asserting a Play button on an unplayable book would be
 * asserting a bug.
 *
 * The rule these helpers enforce: find a card that the shelf itself advertises
 * as playable, and derive the item id from that card's own cover URL. The
 * target then comes from what the UI actually renders, not from a hardcoded id
 * that would rot.
 */
import type { Locator, Page } from '@playwright/test'

/** Navigate without hanging on long-poll / analytics sockets that never idle. */
export async function gotoStable(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForLoadState('load', { timeout: 15_000 }).catch(() => {})
}

/** The player panel only mounts once a stream item is set. */
export function playerPanel(page: Page): Locator {
  return page.locator('.glassmorphism.fixed.bottom-0')
}

/** The player mounts one <audio> element onto <body>; see LocalAudioPlayer. */
export function audioElement(page: Page): Locator {
  return page.locator('#audio-player')
}

export async function dismissPlayerIfOpen(page: Page): Promise<void> {
  const pause = page.getByRole('button', { name: 'Pause', exact: true }).first()
  if (await pause.isVisible().catch(() => false)) {
    await pause.click().catch(() => {})
    await page.waitForTimeout(500)
  }
}

/**
 * Finds an item id that the shelf itself advertises as playable, and returns
 * it together with the Play button that proved it.
 */
export async function findPlayableCard(page: Page): Promise<{ itemId: string; playButton: Locator }> {
  const cards = page.locator('.group.h-full')
  const count = await cards.count()
  for (let i = 0; i < count; i++) {
    const card = cards.nth(i)
    await card.hover().catch(() => {})
    await page.waitForTimeout(150)
    const play = card.getByRole('button', { name: 'Play', exact: true }).first()
    if (!(await play.isVisible().catch(() => false))) continue
    const src = await card.locator('img[src*="/api/items/"]').first().getAttribute('src')
    const itemId = src?.match(/\/api\/items\/([0-9a-f-]{36})\/cover/)?.[1]
    if (itemId) return { itemId, playButton: play }
  }
  throw new Error(`no playable card found among ${count} cards: the shelf advertises no playable book at all`)
}

/**
 * Walks the real user path to an item page for a book that has audio:
 * /library/books -> find a playable card -> the item's own page.
 *
 * Returns the item id. The library segment is read from the current URL rather
 * than hardcoded, so this keeps working if the shelf moves.
 */
export async function openPlayableItemPage(page: Page): Promise<string> {
  await gotoStable(page, '/library/books')
  await page
    .locator('.group.h-full')
    .first()
    .waitFor({ state: 'visible', timeout: 60_000 })
    .catch(() => {
      throw new Error('No cards rendered on /library/books after waiting')
    })

  const { itemId } = await findPlayableCard(page)
  const libraryId = new URL(page.url()).pathname.split('/')[2] ?? ''
  await page.goto(`/library/${libraryId}/item/${itemId}`, {
    waitUntil: 'domcontentloaded',
    timeout: 90_000,
  })

  // The item page streams: it renders a "Loading..." shell and fills in once
  // the item query resolves, so waiting on the Play button is both the
  // synchronisation point and the playability assertion.
  const play = page.getByRole('button', { name: 'Play', exact: true }).first()
  await play.waitFor({ state: 'visible', timeout: 90_000 }).catch(() => {
    throw new Error(
      `No Play button on the item page for ${itemId}. The playability guard is likely reading a field the API does not return.`
    )
  })
  await dismissPlayerIfOpen(page)
  return itemId
}
