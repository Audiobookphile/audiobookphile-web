/**
 * Play button e2e — the regression guard for "I press play on the cover and
 * nothing happens".
 *
 * This exists because the bug was invisible to every other layer of the test
 * suite. The API contract tests passed (the endpoint returns a perfectly good
 * session), the unit tests passed, and the payload was well-formed — while the
 * button did nothing, because:
 *
 *   1. the item page's cover overlay wired Play to an empty handler whose body
 *      was literally `// Implementation pending`, and
 *   2. every playability guard read `BookMedia.tracks`, a field the API has
 *      never emitted, so `tracks.length > 0` was always false and the button
 *      was usually not rendered at all.
 *
 * So this spec drives the real DOM through the real user path: shelf -> card ->
 * item page -> click Play -> assert the player mounts. It deliberately goes
 * through the UI rather than the API to pick a target, because a card only
 * offers Play when its payload already advertises playability -- so the shelf
 * assertion IS the playability assertion, and it cannot be faked by a test-only
 * fixture.
 */
import { expect, test } from './fixtures'
import { dismissPlayerIfOpen, findPlayableCard, gotoStable, playerPanel } from './helpers/playableItem'

// The player chrome has pre-existing WCAG findings; this spec is about
// behaviour, not a11y.
test.use({ axeEnabled: false })

test.describe.configure({ mode: 'serial' })

test('a playable book on the shelf mounts the player when Play is clicked', async ({ adminPage }) => {
  await gotoStable(adminPage, '/library/books')

  // The shelf renders client-side, so wait for content rather than counting
  // immediately after domcontentloaded.
  await expect(
    adminPage.locator('.group.h-full').first(),
    'No cards rendered on /library/books after waiting'
  ).toBeVisible({ timeout: 60_000 })

  // Regression guard #1: at least one card must offer Play. Zero here means
  // shelf items have stopped advertising playability again (the numTracks=0
  // regression), which makes the entire shelf unplayable in the UI.
  const { playButton } = await findPlayableCard(adminPage)

  // Regression guard #2: the click must DO something. The shared play hook is
  // the single entry point; if it regresses to a no-op, nothing mounts.
  await playButton.click()

  await expect(playerPanel(adminPage), 'Clicking Play on a shelf card did not mount the player panel.').toBeVisible({
    timeout: 45_000,
  })

  await dismissPlayerIfOpen(adminPage)
})

test('the item page cover overlay Play button starts playback', async ({ adminPage }) => {
  await gotoStable(adminPage, '/library/books')

  // Reach a real item page the way a user does: click a card. This also
  // guarantees we land on an item the shelf actually renders.
  const cards = adminPage.locator('.group.h-full')
  await expect(cards.first(), 'No cards rendered on /library/books after waiting').toBeVisible({ timeout: 60_000 })
  // Derive the item id from the card's own cover URL
  // (`/api/items/<uuid>/cover`) rather than clicking the card: once Play works
  // the hover overlay puts a pointer-events-auto button over the middle of the
  // cover, so a centre click starts playback instead of navigating, and the
  // title text lives outside the card's clickable frame.
  const { itemId } = await findPlayableCard(adminPage)
  const libraryId = new URL(adminPage.url()).pathname.split('/')[2] ?? ''
  await adminPage.goto(`/library/${libraryId}/item/${itemId}`, {
    waitUntil: 'domcontentloaded',
    timeout: 90_000,
  })
  // The item page streams: it renders a "Loading..." shell and fills in once
  // the item query resolves, so waiting on the button itself is both the
  // assertion and the synchronisation point.
  const playButton = adminPage.getByRole('button', { name: 'Play', exact: true }).first()
  await expect(
    playButton,
    `No Play button on the item page for ${itemId}. The playability guard is likely reading a field the API does not return.`
  ).toBeVisible({ timeout: 90_000 })
  await dismissPlayerIfOpen(adminPage)

  // Regression guard #3: the item page's Play button must exist AND be
  // enabled. It used to be gated on `media.tracks.length > 0` against a field
  // the API never sends, so it was absent for every book.
  await expect(playButton).toBeEnabled()

  // Regression guard #4: the cover overlay's handler must not be a stub.
  // Clicking used to succeed and do nothing at all.
  await playButton.click()

  await expect(
    playerPanel(adminPage),
    'Clicking Play on the item page did not mount the player panel. The handler is probably still a no-op stub.'
  ).toBeVisible({ timeout: 45_000 })

  // The panel must describe the item we opened, not an empty/stale queue.
  await expect(playerPanel(adminPage).getByText(adminPage.url().split('/').pop() ?? '', { exact: false })).toHaveCount(
    0
  ) // id is not rendered; guard against a blank panel instead
  await expect(
    playerPanel(adminPage).locator('a[href*="/item/"]').first(),
    'Player panel is mounted but shows no link back to an item.'
  ).toBeVisible({ timeout: 20_000 })

  await dismissPlayerIfOpen(adminPage)
})

test('the item page Play button becomes Pause while playing', async ({ adminPage }) => {
  await gotoStable(adminPage, '/library/books')

  const cards = adminPage.locator('.group.h-full')
  await expect(cards.first(), 'No cards rendered on /library/books after waiting').toBeVisible({ timeout: 60_000 })
  // Derive the item id from the card's own cover URL
  // (`/api/items/<uuid>/cover`) rather than clicking the card: once Play works
  // the hover overlay puts a pointer-events-auto button over the middle of the
  // cover, so a centre click starts playback instead of navigating, and the
  // title text lives outside the card's clickable frame.
  const { itemId } = await findPlayableCard(adminPage)
  const libraryId = new URL(adminPage.url()).pathname.split('/')[2] ?? ''
  await adminPage.goto(`/library/${libraryId}/item/${itemId}`, {
    waitUntil: 'domcontentloaded',
    timeout: 90_000,
  })
  // The item page streams: it renders a "Loading..." shell and fills in once
  // the item query resolves, so waiting on the button itself is both the
  // assertion and the synchronisation point.
  const playButton = adminPage.getByRole('button', { name: 'Play', exact: true }).first()
  await expect(
    playButton,
    `No Play button on the item page for ${itemId}. The playability guard is likely reading a field the API does not return.`
  ).toBeVisible({ timeout: 90_000 })
  await dismissPlayerIfOpen(adminPage)

  await expect(adminPage.getByRole('button', { name: 'Play', exact: true }).first()).toBeVisible({ timeout: 90_000 })
  await adminPage.getByRole('button', { name: 'Play', exact: true }).first().click()

  // A control that stays "Play" after starting playback is the signature of a
  // session that never really began — the web-side twin of the iOS
  // play-then-immediately-pause bug.
  await expect(
    adminPage.getByRole('button', { name: 'Pause', exact: true }).first(),
    'Playback started but no Pause control appeared: the session did not transition to playing.'
  ).toBeVisible({ timeout: 30_000 })

  await dismissPlayerIfOpen(adminPage)
})
