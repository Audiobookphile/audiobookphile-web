'use client'

import { Keyboard } from 'lucide-react'
import Modal from '@/shared/modals/Modal'

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ShortcutItem {
  keys: string[]
  description: string
}

interface ShortcutGroup {
  category: string
  shortcuts: ShortcutItem[]
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    category: 'Playback Controls',
    shortcuts: [
      { keys: ['Space'], description: 'Play / Pause' },
      { keys: ['←'], description: 'Jump backward' },
      { keys: ['→'], description: 'Jump forward' },
      { keys: ['Shift', '←'], description: 'Previous chapter / start' },
      { keys: ['Shift', '→'], description: 'Next chapter' },
      { keys: ['Shift', '↑'], description: 'Increase playback speed' },
      { keys: ['Shift', '↓'], description: 'Decrease playback speed' },
    ],
  },
  {
    category: 'Audio & Volume',
    shortcuts: [
      { keys: ['↑'], description: 'Volume up (+5%)' },
      { keys: ['↓'], description: 'Volume down (-5%)' },
      { keys: ['M'], description: 'Toggle mute' },
    ],
  },
  {
    category: 'Panels & Navigation',
    shortcuts: [
      { keys: ['Q'], description: 'Toggle Up Next queue' },
      { keys: ['C'], description: 'Toggle chapters list' },
      { keys: ['B'], description: 'Toggle bookmarks & notes' },
      { keys: ['?'], description: 'Toggle keyboard shortcuts' },
      { keys: ['Esc'], description: 'Close modal or active player' },
    ],
  },
]

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="sm:max-w-md md:max-w-md lg:max-w-md">
      <div className="flex max-h-[80vh] flex-col p-5">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <Keyboard className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">Keyboard Shortcuts</h2>
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-col gap-4 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.category} className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold tracking-wider text-foreground-muted/70 uppercase">
                {group.category}
              </span>
              <div className="flex flex-col rounded-xl border border-white/10 bg-white/[0.03] p-1.5">
                {group.shortcuts.map((sc, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-foreground/90 transition-colors hover:bg-white/5"
                  >
                    <span>{sc.description}</span>
                    <div className="flex items-center gap-1">
                      {sc.keys.map((k, kIndex) => (
                        <kbd
                          key={kIndex}
                          className="rounded-md border border-white/15 bg-background/80 px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground shadow-xs"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

