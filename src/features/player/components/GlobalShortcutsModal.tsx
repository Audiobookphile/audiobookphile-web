'use client'

import { useEffect, useState } from 'react'
import KeyboardShortcutsModal from '@/features/player/components/KeyboardShortcutsModal'
import { shouldDeferToFocusedElement } from '@/features/player/lib/hotkeyScope'

/**
 * Global Keyboard Shortcuts Modal handler.
 * Listens for '?' (Shift+/) key presses anywhere in the app outside inputs/textareas,
 * as well as the 'audiobookphile:toggle-shortcuts' custom window event.
 */
export default function GlobalShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    function handleToggleEvent() {
      setIsOpen((prev) => !prev)
    }

    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (e.key === '?' || (e.shiftKey && (e.code === 'Slash' || e.key === '/'))) {
        if (shouldDeferToFocusedElement(document.activeElement, e.code, e.shiftKey)) {
          return
        }
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }

    window.addEventListener('audiobookphile:toggle-shortcuts', handleToggleEvent)
    window.addEventListener('keydown', handleGlobalKeyDown)

    return () => {
      window.removeEventListener('audiobookphile:toggle-shortcuts', handleToggleEvent)
      window.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [])

  return <KeyboardShortcutsModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
}

