'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/shared/contexts/UserContext'
import { fetchSimilarItemsAction } from '@/features/library/actions/libraryActions'
import { BookLibraryItem, BookshelfView, PodcastLibraryItem } from '@/types/api'
import BookShelfRow from '../../features/library/components/BookShelfRow'
import BookMediaCard from './media-card/BookMediaCard'
import PodcastMediaCard from './media-card/PodcastMediaCard'

interface SimilarBooksShelfProps {
  libraryItem: BookLibraryItem | PodcastLibraryItem
}

export default function SimilarBooksShelf({ libraryItem }: SimilarBooksShelfProps) {
  const [similarItems, setSimilarItems] = useState<(BookLibraryItem | PodcastLibraryItem)[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasEmbedding, setHasEmbedding] = useState(true)

  const { serverSettings, user, ereaderDevices } = useUser()

  useEffect(() => {
    let isMounted = true
    const fetchSimilarItems = async () => {
      setIsLoading(true)
      try {
        // A server action, not bare fetch(): bare fetch skipped the API layer
        // and its session token, so this 401'd on every item page.
        const data = await fetchSimilarItemsAction<BookLibraryItem | PodcastLibraryItem>(libraryItem.id)

        if (!data?.similarItems || data.similarItems.length === 0) {
          if (isMounted) setHasEmbedding(false)
          return
        }

        if (isMounted) {
          setSimilarItems(data.similarItems)
          setHasEmbedding(true)
        }
      } catch (err) {
        console.error('Error in fetchSimilarItems:', err)
        if (isMounted) setHasEmbedding(false)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    fetchSimilarItems()

    return () => {
      isMounted = false
    }
  }, [libraryItem.id])

  if (isLoading) {
    return (
      <div className="mt-12">
        <h2 className="mb-4 text-xl font-semibold opacity-50">Loading similar items...</h2>
      </div>
    )
  }

  if (!hasEmbedding || similarItems.length === 0) {
    return null
  }

  return (
    <div className="relative z-10 mt-12">
      <BookShelfRow title="Similar to this">
        {similarItems.map((item, index) => {
          const props = {
            libraryItem: item,
            bookshelfView: BookshelfView.STANDARD,
            dateFormat: serverSettings?.dateFormat || 'yyyy-MM-dd',
            timeFormat: serverSettings?.timeFormat || 'HH:mm',
            userPermissions: user.permissions || {},
            ereaderDevices: ereaderDevices || [],
            showSubtitles: false,
            entityIndex: index,
          }

          if (item.mediaType === 'book') {
            return <BookMediaCard key={item.id} {...(props as any)} />
          }
          return <PodcastMediaCard key={item.id} {...(props as any)} />
        })}
      </BookShelfRow>
    </div>
  )
}
