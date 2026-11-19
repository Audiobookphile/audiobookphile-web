import { describe, expect, it } from 'bun:test'
import { shouldDeferToFocusedElement } from '@/features/player/lib/hotkeyScope'

function el(tagName: string, attrs: Record<string, string> = {}, isContentEditable = false) {
  return {
    tagName,
    isContentEditable,
    getAttribute: (name: string) => attrs[name.toLowerCase()] ?? null,
    hasAttribute: (name: string) => name.toLowerCase() in attrs,
  }
}

const body = el('body')
const textInput = el('input', { type: 'text' })
const textarea = el('textarea')
const contentEditable = el('div', {}, true)

describe('Player Hotkeys Scope for B, C and Shortcuts', () => {
  it('gives hotkeys KeyB, KeyC, KeyQ, and Slash to the player when body is focused', () => {
    expect(shouldDeferToFocusedElement(body, 'KeyB')).toBe(false)
    expect(shouldDeferToFocusedElement(body, 'KeyB', true)).toBe(false)
    expect(shouldDeferToFocusedElement(body, 'KeyC')).toBe(false)
    expect(shouldDeferToFocusedElement(body, 'KeyQ')).toBe(false)
    expect(shouldDeferToFocusedElement(body, 'KeyS')).toBe(false)
    expect(shouldDeferToFocusedElement(body, 'KeyS', true)).toBe(false)
    expect(shouldDeferToFocusedElement(body, 'Slash', true)).toBe(false)
    expect(shouldDeferToFocusedElement(body, 'ArrowRight')).toBe(false)
    expect(shouldDeferToFocusedElement(body, 'Shift-ArrowRight', true)).toBe(false)
    expect(shouldDeferToFocusedElement(body, 'Shift-ArrowLeft', true)).toBe(false)
    expect(shouldDeferToFocusedElement(null, 'KeyB')).toBe(false)
    expect(shouldDeferToFocusedElement(null, 'KeyS')).toBe(false)
  })

  it('defers KeyB, KeyC, KeyQ, KeyS, and Slash when typing inside text inputs, textareas, or contentEditable', () => {
    // When typing in chapter search or bookmark notes, 'b', 'c', 'q', 's', or '?' must type normally
    expect(shouldDeferToFocusedElement(textInput, 'KeyB')).toBe(true)
    expect(shouldDeferToFocusedElement(textInput, 'KeyC')).toBe(true)
    expect(shouldDeferToFocusedElement(textInput, 'KeyQ')).toBe(true)
    expect(shouldDeferToFocusedElement(textInput, 'KeyS')).toBe(true)
    expect(shouldDeferToFocusedElement(textInput, 'Slash', true)).toBe(true)

    expect(shouldDeferToFocusedElement(textarea, 'KeyB')).toBe(true)
    expect(shouldDeferToFocusedElement(textarea, 'KeyC')).toBe(true)
    expect(shouldDeferToFocusedElement(textarea, 'KeyQ')).toBe(true)
    expect(shouldDeferToFocusedElement(textarea, 'KeyS')).toBe(true)
    expect(shouldDeferToFocusedElement(textarea, 'BracketLeft')).toBe(true)
    expect(shouldDeferToFocusedElement(textarea, 'BracketRight')).toBe(true)
    expect(shouldDeferToFocusedElement(textarea, 'Digit0')).toBe(true)
    expect(shouldDeferToFocusedElement(textarea, 'Slash', true)).toBe(true)

    expect(shouldDeferToFocusedElement(contentEditable, 'KeyB')).toBe(true)
    expect(shouldDeferToFocusedElement(contentEditable, 'KeyQ')).toBe(true)
    expect(shouldDeferToFocusedElement(contentEditable, 'KeyS')).toBe(true)
    expect(shouldDeferToFocusedElement(contentEditable, 'BracketLeft')).toBe(true)
    expect(shouldDeferToFocusedElement(contentEditable, 'Digit0')).toBe(true)
  })

  it('allows BracketLeft, BracketRight and Digit0 to reach the player when body is focused', () => {
    expect(shouldDeferToFocusedElement(body, 'BracketLeft')).toBe(false)
    expect(shouldDeferToFocusedElement(body, 'BracketRight')).toBe(false)
    expect(shouldDeferToFocusedElement(body, 'Digit0')).toBe(false)
    expect(shouldDeferToFocusedElement(body, 'Numpad0')).toBe(false)
  })
})
