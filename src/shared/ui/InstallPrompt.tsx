'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

/**
 * The event Chromium fires when the app is installable.
 *
 * It is not in the DOM lib -- `beforeinstallprompt` is a non-standard
 * event -- so the two members this component uses are declared here rather
 * than reached for with `any`.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [isInstallable, setIsInstallable] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      // The event is a `BeforeInstallPromptEvent`; the DOM lib types the
      // listener as a plain `Event` because the event is not in the lib.
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // The prompt has to be shown before the choice can be resolved, so this
    // is awaited rather than fired and forgotten. The `any` that used to be
    // here hid the promise from the linter, which is the only reason it was
    // not awaited before.
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }

    setDeferredPrompt(null)
    setIsInstallable(false)
  }

  if (!isInstallable || isInstalled) return null

  return (
    <div className="animate-in slide-in-from-bottom-5 fade-in fixed bottom-20 left-1/2 z-50 -translate-x-1/2 duration-300">
      <div className="text-primary-foreground border-primary-foreground/20 flex items-center space-x-4 rounded-full border bg-primary/90 px-6 py-3 shadow-lg backdrop-blur-md">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Install Audiobookphile</span>
          <span className="text-xs opacity-80">Add to home screen for offline listening</span>
        </div>
        <button
          type="button"
          onClick={handleInstallClick}
          className="rounded-full bg-background px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-background/90"
        >
          Install
        </button>
        <button
          type="button"
          aria-label="Dismiss install prompt"
          onClick={() => setIsInstallable(false)}
          className="rounded-full p-2 opacity-60 transition-opacity hover:opacity-100"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
