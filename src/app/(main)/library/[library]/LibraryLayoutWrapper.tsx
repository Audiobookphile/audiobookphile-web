'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { useLibrary } from '@/features/library/contexts/LibraryContext'
import { useMediaContext } from '@/features/player/contexts/MediaContext'
import { useUser } from '@/shared/contexts/UserContext'
import { mergeClasses } from '@/shared/lib/merge-classes'
import CoverSizeWidget from '@/shared/widgets/CoverSizeWidget'
import SideRail from '../../SideRail'
import Toolbar from './Toolbar'

interface LibraryLayoutWrapperProps {
  children: React.ReactNode
}

export default function LibraryLayoutWrapper({ children }: LibraryLayoutWrapperProps) {
  const { libraryItemIdStreaming, setLastCurrentLibraryId } = useMediaContext()
  const { Source, serverSettings } = useUser()
  const { library, boundModal, setBoundModal } = useLibrary()
  const pathname = usePathname()
  const serverVersion = serverSettings?.version || 'Error'
  const installSource = Source || 'Unknown'
  const isLibraryItemPage = pathname.includes('/item/')

  useEffect(() => {
    if (library) {
      setLastCurrentLibraryId(library.id)
    }
  }, [library, setLastCurrentLibraryId])

  useEffect(() => {
    setBoundModal(null)
  }, [pathname, setBoundModal])

  return (
    <div
      className={mergeClasses('page-wrapper relative flex overflow-hidden', libraryItemIdStreaming ? 'streaming' : '')}
    >
      <SideRail serverVersion={serverVersion} installSource={installSource} />
      <div className="page-bg-gradient min-w-0 flex-1 overflow-hidden">
        {!isLibraryItemPage && <Toolbar />}
        {/* subtract height of toolbar if not library item page */}
        <div
          className={mergeClasses(
            'w-full overflow-x-hidden overflow-y-auto',
            isLibraryItemPage ? 'h-full' : 'h-[calc(100%-2.5rem)]'
          )}
        >
          {children}
        </div>
      </div>

      {!isLibraryItemPage && <CoverSizeWidget className="absolute right-3 bottom-3 z-50 sm:right-4 sm:bottom-4" />}
      {boundModal}
    </div>
  )
}
