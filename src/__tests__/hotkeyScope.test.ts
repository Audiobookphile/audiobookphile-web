import { describe, expect, it } from 'bun:test'
import { shouldDeferToFocusedElement } from '@/features/player/lib/hotkeyScope'

/**
 * Keyboard scoping for the player's global hotkeys.
 *
 * The listener is on `document`, so it fires for every key in the app. The old
 * guard recognised only text-entry elements, which produced two concrete bugs:
 *
 *  1. Space on a focused button toggled playback *and* activated the button,
 *     because Space natively activates a button.
 *  2. ArrowRight on the focused scrubber ran the slider's own
 *     `seek(currentTime + 5)` AND the global `jumpForward()` — a 15s jump while
 *     the UI displayed 5s. `PlayerTrackBar` is a `role="slider"` with
 *     `tabIndex={0}`, so this was reachable by keyboard alone.
 *
 * The rule is per-key, not per-element. Volume, mute and Escape deliberately stay
 * global, so those cases are asserted too — a fix that simply disabled the
 * hotkeys whenever anything was focused would pass the bug cases and break the
 * feature.
 */
function el(tagName: string, attrs: Record<string, string> = {}, isContentEditable = false) {
  return {
    tagName,
    isContentEditable,
    getAttribute: (name: string) => attrs[name.toLowerCase()] ?? null,
    hasAttribute: (name: string) => name.toLowerCase() in attrs,
  }
}

const body = el('body')
const scrubber = el('div', { role: 'slider', tabindex: '0' })
const button = el('button', { type: 'button' })
const link = el('a', { href: '/library' })
const textInput = el('input', { type: 'text' })

describe('shouldDeferToFocusedElement', () => {
  it('gives the hotkeys the keyboard when nothing interactive has focus', () => {
    expect(shouldDeferToFocusedElement(body, 'Space')).toBe(false)
    expect(shouldDeferToFocusedElement(body, 'ArrowRight')).toBe(false)
    expect(shouldDeferToFocusedElement(body, 'KeyM')).toBe(false)
    expect(shouldDeferToFocusedElement(null, 'Space')).toBe(false)
  })

  it('leaves Space to a focused button (the regression: double activation)', () => {
    // Before: Space both pressed the button and toggled playback.
    expect(shouldDeferToFocusedElement(button, 'Space')).toBe(true)
    expect(shouldDeferToFocusedElement(link, 'Space')).toBe(true)
  })

  it('leaves arrows to the focused scrubber (the 15s-vs-5s regression)', () => {
    // Before: the slider seeked 5s and the global handler jumped 10s, in one press.
    for (const code of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
      expect(shouldDeferToFocusedElement(scrubber, code)).toBe(true)
    }
  })

  it('still gives volume/mute/escape to the hotkeys when a button has focus', () => {
    // A blanket "anything focused disables the hotkeys" fix would pass the two
    // regressions above and silently break the feature. These must stay global.
    expect(shouldDeferToFocusedElement(button, 'ArrowUp')).toBe(false)
    expect(shouldDeferToFocusedElement(button, 'ArrowDown')).toBe(false)
    expect(shouldDeferToFocusedElement(button, 'KeyM')).toBe(false)
    expect(shouldDeferToFocusedElement(button, 'Escape')).toBe(false)
  })

  it('keeps the hotkeys away from text entry entirely', () => {
    for (const code of ['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyM', 'Escape']) {
      expect(shouldDeferToFocusedElement(textInput, code)).toBe(true)
    }
    expect(shouldDeferToFocusedElement(el('div', {}, true), 'Space')).toBe(true)
    expect(shouldDeferToFocusedElement(el('textarea'), 'Space')).toBe(true)
  })

  it('defers to any explicitly focusable custom control', () => {
    // The catch-all for controls this test has not enumerated.
    expect(shouldDeferToFocusedElement(el('div', { tabindex: '0' }), 'ArrowRight')).toBe(true)
    // tabindex="-1" is programmatic-only focus, so it is not a user key target.
    expect(shouldDeferToFocusedElement(el('div', { tabindex: '-1' }), 'ArrowRight')).toBe(false)
  })

  it('respects the Shift modifier when scoping', () => {
    // Shift-Arrow changes playback rate; the scrubber still owns the arrow key.
    expect(shouldDeferToFocusedElement(scrubber, 'ArrowUp', true)).toBe(true)
    expect(shouldDeferToFocusedElement(body, 'ArrowUp', true)).toBe(false)
  })
})
