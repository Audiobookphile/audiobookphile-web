import { describe, expect, it } from 'bun:test'
import { shouldDeferToFocusedElement } from '@/features/player/lib/hotkeyScope'
import { playSleepTimerExpiryChime } from '@/features/player/lib/soundEffects'

describe('Upstream Features: Keyboard Shortcuts Modal & Sleep Timer Chime', () => {
  describe('Global Shortcuts Hotkey Scoping', () => {
    it('defers to INPUT elements for all keys', () => {
      const input = { tagName: 'INPUT' } as unknown as Element
      expect(shouldDeferToFocusedElement(input, 'Slash', false)).toBeTrue()
      expect(shouldDeferToFocusedElement(input, 'Slash', true)).toBeTrue()
      expect(shouldDeferToFocusedElement(input, 'Space', false)).toBeTrue()
    })

    it('defers to TEXTAREA elements for all keys', () => {
      const textarea = { tagName: 'TEXTAREA' } as unknown as Element
      expect(shouldDeferToFocusedElement(textarea, 'Slash', true)).toBeTrue()
      expect(shouldDeferToFocusedElement(textarea, 'KeyB', false)).toBeTrue()
    })

    it('defers to contentEditable elements', () => {
      const div = { tagName: 'DIV', isContentEditable: true } as unknown as Element
      expect(shouldDeferToFocusedElement(div, 'Slash', true)).toBeTrue()
    })

    it('allows global shortcuts when body or container element is focused', () => {
      const body = { tagName: 'BODY' } as unknown as Element
      expect(shouldDeferToFocusedElement(body, 'Slash', true)).toBeFalse()
      expect(shouldDeferToFocusedElement(body, 'KeyM', false)).toBeFalse()
      expect(shouldDeferToFocusedElement(null, 'Slash', true)).toBeFalse()
    })
  })

  describe('Sleep Timer Expiry Chime Synthesis', () => {
    it('executes safely in server/headless environments without throwing', () => {
      expect(() => {
        playSleepTimerExpiryChime()
      }).not.toThrow()
    })
  })
})

