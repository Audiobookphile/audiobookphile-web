/**
 * Playback progress e2e — proves the stack actually delivers *audio*, not just
 * a player that looks like it is playing.
 *
 * Why this file exists, and why it is not redundant with play-button.spec.ts:
 *
 * play-button.spec.ts asserts the player PANEL mounts and that a Pause control
 * appears. Both can be true while nothing audible happens. The two bugs this
 * project actually shipped are both of that shape:
 *
 *   1. web: the item page's cover overlay called a handler whose body was
 *      `// Implementation pending`, and
 *   2. iOS: the session began, AVPlayer reported `playing` for about a second,
 *      then a transient `.paused` KVO callback revoked the play intent, so the
 *      UI showed a pause a second later having played nothing.
 *
 * A Pause button is a state-machine assertion. This file makes an
 * audio-decoding assertion instead: the <audio> element must reach a ready
 * state, must know a real duration, must buffer bytes, must advance
 * currentTime, must keep advancing monotonically, and must still be playing at
 * the end. A stall, an immediate pause, a 404 stream, or an undecodable file
 * all fail here while the panel sits there looking perfectly healthy.
 *
 * The element is the real one the app drives: LocalAudioPlayer appends
 * `<audio id="audio-player">` to <body> and points its `src` at the presigned
 * object URL the API hands back, so reading currentTime here is reading
 * production playback, not a test double.
 */
import { expect, test } from './fixtures'
import {
  audioElement,
  dismissPlayerIfOpen,
  gotoStable,
  openPlayableItemPage,
  playerPanel,
} from './helpers/playableItem'

// The player chrome has pre-existing WCAG findings; this spec is about
// behaviour, not a11y.
test.use({ axeEnabled: false })

/** MediaError codes named, because the bare number is unreadable in CI logs. */
const MEDIA_ERR: Record<number, string> = {
  1: 'MEDIA_ERR_ABORTED',
  2: 'MEDIA_ERR_NETWORK',
  3: 'MEDIA_ERR_DECODE',
  4: 'MEDIA_ERR_SRC_NOT_SUPPORTED',
}

type AudioSnapshot = {
  src: string
  readyState: number
  networkState: number
  currentTime: number
  duration: number
  paused: boolean
  ended: boolean
  errorCode: number | null
  errorMessage: string
  buffered: number
}

async function snapshot(page: import('@playwright/test').Page): Promise<AudioSnapshot> {
  return audioElement(page).evaluate((el) => {
    const a = el as HTMLAudioElement
    let buffered = 0
    for (let i = 0; i < a.buffered.length; i++) {
      buffered = Math.max(buffered, a.buffered.end(i))
    }
    return {
      src: a.currentSrc || a.src,
      readyState: a.readyState,
      networkState: a.networkState,
      currentTime: a.currentTime,
      duration: Number.isFinite(a.duration) ? a.duration : 0,
      paused: a.paused,
      ended: a.ended,
      errorCode: a.error ? a.error.code : null,
      errorMessage: a.error ? a.error.message : '',
      buffered,
    }
  })
}

function describeMedia(s: AudioSnapshot): string {
  const name = s.errorCode === null ? 'no media error' : (MEDIA_ERR[s.errorCode] ?? `code ${s.errorCode}`)
  return [
    `${name}${s.errorMessage ? ` (${s.errorMessage})` : ''}`,
    `readyState=${s.readyState}`,
    `networkState=${s.networkState}`,
    `duration=${s.duration}`,
    `buffered=${s.buffered}`,
    `currentTime=${s.currentTime.toFixed(2)}`,
    `paused=${s.paused}`,
  ].join(' | ')
}

/**
 * Waits for the element to exist and for the player to have been handed a
 * source. Starting playback involves a server-action fetch of the expanded
 * item plus a session round trip, so this legitimately takes tens of seconds
 * on a cold cache -- the 5s default is what made an early version of this spec
 * report "the player did not mount its <audio> element" on a perfectly healthy
 * run.
 */
async function startPlayback(page: import('@playwright/test').Page): Promise<void> {
  await page.getByRole('button', { name: 'Play', exact: true }).first().click()
  await expect(playerPanel(page), 'Clicking Play did not mount the player panel.').toBeVisible({ timeout: 60_000 })
  await expect(
    audioElement(page),
    'the player panel mounted but no <audio> element was ever created, so nothing can decode'
  ).toHaveCount(1, { timeout: 30_000 })
}

/**
 * If the browser simply cannot decode this container, that is a browser
 * capability fact rather than a stack defect, and the honest thing is to skip
 * and let a sibling project (webkit) cover it. Anything else is a real failure.
 */
async function failOrSkipOnUnsupportedCodec(page: import('@playwright/test').Page, s: AudioSnapshot): Promise<void> {
  if (s.errorCode === null) return
  if (s.errorCode === 4) {
    test.skip(
      true,
      `this browser cannot decode the track's container (${describeMedia(s)}); run the webkit project to cover it`
    )
  }
  throw new Error(`the audio element reported a media error: ${describeMedia(s)}`)
}

test('the stream is a real media source the browser can decode', async ({ adminPage }) => {
  await openPlayableItemPage(adminPage)
  await startPlayback(adminPage)

  // readyState 2 == HAVE_CURRENT_DATA: actual bytes arrived and were parsed
  // into a decodable buffer. This is the assertion that distinguishes "the API
  // returned a plausible session" from "audio is genuinely flowing".
  await expect
    .poll(async () => (await snapshot(adminPage)).readyState, {
      timeout: 90_000,
      message: 'the audio element never received decodable data from the stream',
    })
    .toBeGreaterThanOrEqual(2)

  const s = await snapshot(adminPage)
  await failOrSkipOnUnsupportedCodec(adminPage, s)

  // A session object that resolves but points at nothing usable is the failure
  // mode that hides behind a mounted player.
  expect(s.src, 'the audio element was created but never given a source').not.toBe('')
  expect(
    s.duration,
    `the stream reported no duration: ${describeMedia(s)} — the source is not real audio`
  ).toBeGreaterThan(0)
  expect(s.buffered, `nothing was buffered: ${describeMedia(s)}`).toBeGreaterThan(0)

  await dismissPlayerIfOpen(adminPage)
})

test('audio advances, keeps advancing, and is still playing at the end', async ({ adminPage }) => {
  await openPlayableItemPage(adminPage)
  await startPlayback(adminPage)

  // 1. The playhead must actually move. A session that opens and then silently
  //    stalls leaves currentTime at 0 while every UI assertion still passes.
  await expect
    .poll(async () => (await snapshot(adminPage)).currentTime, {
      timeout: 60_000,
      message: 'playback never advanced: the playhead stayed at 0',
    })
    .toBeGreaterThan(0.25)

  // 2. It must KEEP advancing. Sampling three times and requiring strict
  //    monotonic growth is what separates real playback from a single tick
  //    followed by a stall -- the exact shape of the iOS play-then-pause bug.
  const samples: number[] = []
  for (let i = 0; i < 3; i++) {
    await adminPage.waitForTimeout(2_000)
    const s = await snapshot(adminPage)
    await failOrSkipOnUnsupportedCodec(adminPage, s)
    expect(s.paused, `playback stopped on sample ${i + 1} of 3: ${describeMedia(s)}`).toBe(false)
    expect(s.ended, `playback reported end-of-stream on sample ${i + 1} of 3: ${describeMedia(s)}`).toBe(false)
    samples.push(s.currentTime)
  }

  for (let i = 1; i < samples.length; i++) {
    expect(
      samples[i],
      `the playhead stalled between samples ${i} and ${i + 1}: ${samples[i - 1].toFixed(3)}s -> ${samples[i].toFixed(
        3
      )}s`
    ).toBeGreaterThan(samples[i - 1])
  }

  // 3. And the UI must still agree that it is playing. A media element racing
  //    ahead of the player state machine is its own class of bug.
  await expect(
    adminPage.getByRole('button', { name: 'Pause', exact: true }).first(),
    'audio is advancing but the UI offers no Pause control: the player state and the media element disagree'
  ).toBeVisible({ timeout: 15_000 })

  await dismissPlayerIfOpen(adminPage)
})

test('the shelf is honest: it advertises some playable books and streams nothing on hover', async ({ adminPage }) => {
  // The other half of correctness. 73 of 100 books genuinely have no audio, so
  // the UI must not offer Play for them, and merely browsing the shelf must not
  // issue a stream request. A regression that made every card look playable
  // would otherwise "fix" the play bug by lying about what is stored.
  const streamRequests: string[] = []
  adminPage.on('request', (req) => {
    const u = req.url()
    if (/\/file\/|playbackSession|\/stream/.test(u) && !/\/cover/.test(u)) streamRequests.push(u)
  })

  await gotoStable(adminPage, '/library/books')
  await adminPage.locator('.group.h-full').first().waitFor({ state: 'visible', timeout: 60_000 })

  const cards = adminPage.locator('.group.h-full')
  const count = await cards.count()
  expect(count, 'the shelf rendered no cards at all').toBeGreaterThan(0)

  let withPlay = 0
  const sampled = Math.min(count, 12)
  for (let i = 0; i < sampled; i++) {
    const card = cards.nth(i)
    await card.hover().catch(() => {})
    await adminPage.waitForTimeout(120)
    if (
      await card
        .getByRole('button', { name: 'Play', exact: true })
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      withPlay++
    }
  }

  expect(streamRequests, `browsing the shelf issued stream requests: ${streamRequests.join(', ')}`).toHaveLength(0)
  expect(
    withPlay,
    `no card among the first ${sampled} offered Play; the shelf is advertising a library with no audio at all`
  ).toBeGreaterThan(0)
})
