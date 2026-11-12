'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { getLibrarySlug } from '@/shared/lib/library-slugs'
import Dropdown from '@/shared/ui/Dropdown'
import { Library } from '@/types/api'

interface LibrariesDropdownProps {
  libraries: Library[]
  currentLibraryId: string
}

const bookLibraryPages = ['bookshelf', 'series', 'collections', 'playlists', 'authors', 'narrators', 'stats']
const podcastLibraryPages = ['bookshelf', 'latest', 'playlists', 'search', 'download-queue']

export default function LibrariesDropdown({ libraries, currentLibraryId }: LibrariesDropdownProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  function getLibraryPath(libraryId: string) {
    const library = libraries.find((l) => l.id === libraryId)
    let page = pathname.split('/').pop() || ''
    if (library) {
      if (page && library.mediaType === 'book' && !bookLibraryPages.includes(page)) {
        page = ''
      } else if (page && library.mediaType === 'podcast' && !podcastLibraryPages.includes(page)) {
        page = ''
      }
    }

    const slug = library ? getLibrarySlug(library, libraries) : libraryId
    return page ? `/library/${slug}/${page}` : `/library/${slug}`
  }

  const libraryItems = libraries.map((library) => ({
    text: library.name,
    value: library.id,
  }))

  return (
    <div className="relative">
      <Dropdown
        items={libraryItems}
        menuMaxHeight="80vh"
        size="small"
        disabled={isPending}
        value={currentLibraryId}
        onChange={(value) => {
          startTransition(() => {
            router.push(getLibraryPath(String(value)))
          })
        }}
      />
    </div>
  )
}
