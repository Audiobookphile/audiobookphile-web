/**
 * Decides whether a keyboard event belongs to the focused element or to the
 * player's global hotkeys.
 *
 * The original guard only recognised `input`, `textarea`, `select` and
 * `contentEditable`, and the listener was on `document`, so while audio played
 * every key below reached the player no matter what had focus:
 *
 *  - Space on a focused button activated the button's *and* the player's, because
 *    Space natively activates a button. Every button in the app sat on the
 *    keyboard-focus path for "press play".
 *  - ArrowLeft/ArrowRight on the focused scrubber fired the slider's own
 *    `seek(currentTime ± 5)` *and* the global `jumpForward/jumpBackward`, so one
 *    keypress moved playhead 15s while the UI displayed 5s.
 *  - Arrow keys anywhere else were dead for page scrolling, because the handler
 *    calls `preventDefault()` unconditionally.
 *
 * The rule here is per-key, not per-element: an element is only allowed to keep a
 * key that it would natively consume. Volume (ArrowUp/ArrowDown), mute (M) and
 * Escape stay global even while a control is focused, because nothing else
 * consumes them and they are the point of the feature.
 *
 * `isTarget` is structural rather than `Element` so this is unit-testable without
 * a DOM, and so it works with the `document.activeElement` we actually get.
 */
export interface KeyEventTargetLike {
  tagName?: string
  getAttribute?(name: string): string | null
  hasAttribute?(name: string): boolean
  isContentEditable?: boolean
}

/** Keys an element may legitimately consume, and therefore that we must not steal. */
function targetConsumes(target: KeyEventTargetLike, code: string): boolean {
  const tag = (target.tagName ?? '').toLowerCase()

  // Text entry: every key we bind is meaningless while typing.
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  if (target.isContentEditable) return true

  // Space natively activates these. Pressing it must not also toggle playback.
  if (code === 'Space' && (tag === 'button' || tag === 'a' || tag === 'summary')) {
    return true
  }

  // A slider (the scrubber) handles its own arrow keys. ArrowUp/ArrowDown are
  // included because role="slider" may be vertical, and a horizontal scrubber
  // ignores them -- losing volume control while the scrubber is focused is a far
  // smaller cost than a 15s jump that the UI says was 5s.
  //
  // The Shift- prefix is stripped first: Shift-Arrow changes playback rate, but
  // it is still an arrow key, and matching on `startsWith('Arrow')` alone would
  // let Shift-ArrowRight through to the global jump while the scrubber was
  // focused -- reintroducing the double-jump for the shifted variant.
  if (code.replace(/^Shift-/, '').startsWith('Arrow')) {
    const role = target.getAttribute?.('role')
    if (role === 'slider' || role === 'spinbutton' || role === 'listbox') return true

    // Any explicitly focusable element may have its own key handling. This is the
    // conservative catch-all for custom controls we have not enumerated.
    if (target.hasAttribute?.('tabindex') && target.getAttribute?.('tabindex') !== '-1') {
      return true
    }
  }

  return false
}

export function shouldDeferToFocusedElement(
  target: KeyEventTargetLike | null,
  code: string,
  shiftKey = false
): boolean {
  if (!target) return false
  // Focus on the body means nothing interactive has focus: the hotkeys own it.
  if ((target.tagName ?? '').toLowerCase() === 'body') return false
  return targetConsumes(target, shiftKey ? `Shift-${code}` : code)
}
