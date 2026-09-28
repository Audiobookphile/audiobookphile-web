import { expect, test } from './fixtures'
import { audioElement, openPlayableItemPage, playerPanel } from './helpers/playableItem'

/**
 * Guards the GPU track layer's contract in a real browser.
 *
 * The point is the *fallback*: the DOM track must remain the accessible
 * control and the only visual when WebGPU is absent, which is the case for
 * headless Chromium. If this layer ever leaked into the accessibility tree,
 * blocked pointer events, or displaced the slider, seeking would break.
 */
test.use({ axeEnabled: false })

test('the track keeps a single accessible slider and the GPU layer stays inert without WebGPU', async ({
  adminPage,
}) => {
  test.setTimeout(120_000)
  await openPlayableItemPage(adminPage)
  // The track only exists once the player panel is mounted, so start playback
  // the same way the playback spec does.
  await adminPage.getByRole('button', { name: 'Play', exact: true }).first().click()
  await expect(playerPanel(adminPage)).toBeVisible({ timeout: 60_000 })
  await expect(audioElement(adminPage)).toHaveCount(1, { timeout: 30_000 })

  const slider = adminPage.getByRole('slider', { name: 'Playback position' })
  await expect(slider).toBeVisible()

  // Exactly one slider: the GPU canvas must not add a second control.
  await expect(adminPage.getByRole('slider')).toHaveCount(1)

  // The canvas, when present, is hidden from assistive tech and from the
  // pointer, so the slider keeps receiving every interaction.
  const canvas = adminPage.locator('canvas[data-cyid="player-track-gpu"]')
  if (await canvas.count()) {
    await expect(canvas).toHaveAttribute('aria-hidden', 'true')
    const pe = await canvas.evaluate((el) => getComputedStyle(el).pointerEvents)
    expect(pe, 'GPU layer must not intercept pointer events aimed at the slider').toBe('none')
  }

  // Clicking the middle of the track still seeks: the real proof that hit
  // testing survived the overlay.
  const before = await slider.getAttribute('aria-valuenow')
  const box = await slider.boundingBox()
  expect(box).not.toBeNull()
  await adminPage.mouse.click(box!.x + box!.width * 0.75, box!.y + box!.height / 2)
  await adminPage.waitForTimeout(1_500)
  const after = await slider.getAttribute('aria-valuenow')
  expect(after, `seek did not move the playhead (was ${before}, now ${after})`).not.toBe(before)

  // Keyboard seeking is unaffected.
  await slider.focus()
  const kbBefore = await slider.getAttribute('aria-valuenow')
  await adminPage.keyboard.press('ArrowRight')
  await adminPage.waitForTimeout(800)
  expect(await slider.getAttribute('aria-valuenow')).not.toBe(kbBefore)
})
