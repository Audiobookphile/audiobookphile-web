import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchAuthorsAction,
  fetchCollectionsAction,
  fetchLibraryItemsAction,
  fetchPlaylistsAction,
  fetchSeriesAction,
} from '@/features/library/actions/libraryActions'
import { useLibrary } from '@/features/library/contexts/LibraryContext'
import { useSocketEvent } from '@/shared/contexts/SocketContext'
import { BookshelfEntity, BookshelfPageResponse, EntityType, LibraryItem, MediaItemShare, RssFeed } from '@/types/api'

interface UseBookshelfDataProps {
  entityType: EntityType
  query: string // URLSearchParams string
  itemsPerPage: number
}

// Fetch action dispatcher based on entity type
async function fetchEntityData(entityType: EntityType, libraryId: string, queryParams: string) {
  switch (entityType) {
    case 'items':
      return fetchLibraryItemsAction(libraryId, queryParams)
    case 'series':
      return fetchSeriesAction(libraryId, queryParams)
    case 'collections':
      return fetchCollectionsAction(libraryId, queryParams)
    case 'playlists':
      return fetchPlaylistsAction(libraryId, queryParams)
    case 'authors':
      return fetchAuthorsAction(libraryId, queryParams)
  }
}

function buildPageQueryParams(entityType: EntityType, query: string, page: number, limit: number): string {
  const fullQuery = query ? `${query}&` : ''
  let queryParams = `${fullQuery}limit=${limit}&page=${page}&minified=1`
  if (entityType === 'items') {
    queryParams += '&include=rssfeed,numEpisodesIncomplete,share'
  }
  return queryParams
}

export function useBookshelfData({ entityType, query, itemsPerPage }: UseBookshelfDataProps) {
  const { library } = useLibrary()
  const libraryId = library.id
  const queryClient = useQueryClient()

  const [totalEntities, setTotalEntities] = useState(0)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const itemsPerPageRef = useRef(itemsPerPage)

  useEffect(() => {
    if (itemsPerPage > 0) {
      itemsPerPageRef.current = itemsPerPage
    }
  }, [itemsPerPage])

  const baseQueryKey = useMemo(() => ['bookshelf', libraryId, entityType, query], [libraryId, entityType, query])

  // We maintain a sparse array of items, but we fetch them using TanStack Query per page
  const [sparseItems, setSparseItems] = useState<(BookshelfEntity | null)[]>([])

  const loadPage = useCallback(
    async (page: number) => {
      const limit = itemsPerPageRef.current
      if (limit <= 0) return

      const pageQueryKey = [...baseQueryKey, 'page', page, 'limit', limit]

      try {
        const data = await queryClient.fetchQuery({
          queryKey: pageQueryKey,
          queryFn: async (): Promise<BookshelfPageResponse> => {
            return await fetchEntityData(entityType, libraryId, buildPageQueryParams(entityType, query, page, limit))
          },
          staleTime: 10 * 60 * 1000, // 10 minutes
          gcTime: 60 * 60 * 1000, // 1 hour memory retention
        })

        const results: BookshelfEntity[] = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data?.authors)
            ? data.authors
            : []
        const total = data?.total ?? results.length

        setTotalEntities(total)
        setIsInitialized(true)
        setError(null)

        setSparseItems((prev) => {
          let next = Array.isArray(prev) ? [...prev] : []
          if (next.length !== total) {
            next = Array.from({ length: total }, () => null)
          }

          const startIndex = page * limit
          results.forEach((item, i) => {
            if (startIndex + i < total) {
              next[startIndex + i] = item
            }
          })
          return next
        })

        // Proactively prefetch the next page for seamless scrolling performance
        const nextPage = page + 1
        if (nextPage * limit < total) {
          const nextPageQueryKey = [...baseQueryKey, 'page', nextPage, 'limit', limit]
          void queryClient.prefetchQuery({
            queryKey: nextPageQueryKey,
            queryFn: async (): Promise<BookshelfPageResponse> => {
              return await fetchEntityData(
                entityType,
                libraryId,
                buildPageQueryParams(entityType, query, nextPage, limit)
              )
            },
            staleTime: 10 * 60 * 1000,
            gcTime: 60 * 60 * 1000,
          })
        }
      } catch (err) {
        console.error('Failed to load bookshelf page', page, err)
        setError(err instanceof Error ? err : new Error('An unknown error occurred'))
      }
    },
    [baseQueryKey, entityType, libraryId, query, queryClient]
  )

  // Invalidate when core params change
  useEffect(() => {
    setSparseItems([])
    setTotalEntities(0)
    setIsInitialized(false)
  }, [baseQueryKey])

  const updateItems = useCallback((updater: (item: BookshelfEntity) => BookshelfEntity) => {
    setSparseItems((prev) => {
      if (!Array.isArray(prev)) return prev
      let changed = false
      const next = prev.map((item) => {
        if (!item) return item
        const nextItem = updater(item)
        if (nextItem !== item) changed = true
        return nextItem
      })
      return changed ? next : prev
    })
  }, [])

  // Socket listeners
  useSocketEvent<MediaItemShare>('share_open', (share) => {
    if (entityType !== 'items') return
    updateItems((item) => {
      const li = item as LibraryItem
      if (li.media.id === share.mediaItemId) return { ...li, mediaItemShare: share }
      return item
    })
  })

  useSocketEvent<MediaItemShare>('share_closed', (share) => {
    if (entityType !== 'items') return
    updateItems((item) => {
      const li = item as LibraryItem
      if (li.media.id === share.mediaItemId) return { ...li, mediaItemShare: undefined }
      return item
    })
  })

  useSocketEvent<RssFeed>('rss_feed_open', (feed) => {
    if (entityType !== 'items' && entityType !== 'series' && entityType !== 'collections') return
    updateItems((item) => {
      if (item.id === feed.entityId) return { ...item, rssFeed: feed }
      return item
    })
  })

  useSocketEvent<RssFeed>('rss_feed_closed', (feed) => {
    if (entityType !== 'items' && entityType !== 'series' && entityType !== 'collections') return
    updateItems((item) => {
      if (item.id === feed.entityId) return { ...item, rssFeed: undefined }
      return item
    })
  })

  return {
    items: sparseItems,
    totalEntities,
    isInitialized,
    isLoading: !isInitialized,
    error,
    loadPage,
    reconcilePagesAfterUpdate: async () => null, // Placeholder for now
  }
}
