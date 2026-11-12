'use client'

import { ArrowLeft } from 'lucide-react'
import { useSettingsDrawer } from '@/shared/contexts/SettingsDrawerContext'
import IconBtn from '@/shared/ui/IconBtn'
import SideNavContent from './SideNavContent'

interface SideNavMobileDrawerProps {
  serverVersion: string
  installSource: string
}

export default function SideNavMobileDrawer({ serverVersion, installSource }: SideNavMobileDrawerProps) {
  const { isOpen, toggle, close } = useSettingsDrawer()

  const handleBackdropClick = () => {
    close()
  }

  const handleItemClick = () => {
    close()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            e.currentTarget.click()
          }
        }}
        aria-label="Close navigation"
        aria-hidden={!isOpen}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-100 ease-in-out md:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={handleBackdropClick}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 z-70 h-full w-64 transform border-e border-border bg-bg shadow-2xl transition-transform duration-100 ease-in-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-12 w-full items-center justify-end border-b border-primary/30 px-4 py-2">
          <IconBtn
            className="md:hidden"
            ariaLabel="Close navigation"
            size="large"
            borderless
            onClick={toggle}
            icon={ArrowLeft}
          />
        </div>
        <div className="h-full max-h-[calc(100%-3rem)] w-full">
          <SideNavContent
            handleItemClick={handleItemClick}
            serverVersion={serverVersion}
            installSource={installSource}
          />
        </div>
      </div>
    </>
  )
}
