'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface CommandPaletteContextType {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  toggle: () => void
}

const CommandPaletteContext = createContext<CommandPaletteContextType>({
  isOpen: false,
  setIsOpen: () => {},
  toggle: () => {},
})

export const useCommandPalette = () => useContext(CommandPaletteContext)

export const CommandPaletteProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false)

  const toggle = () => setIsOpen((prev) => !prev)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  return (
    <CommandPaletteContext.Provider value={{ isOpen, setIsOpen, toggle }}>{children}</CommandPaletteContext.Provider>
  )
}
