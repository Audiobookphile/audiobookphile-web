import { InfiniteData, UseInfiniteQueryResult, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import {
  fetchAuthorsAction,
  fetchCollectionsAction,
  fetchLibraryItemsAction,
  fetchPlaylistsAction,
  fetchSeriesAction,
} from '@/features/library/actions/libraryActions'
import { useSocketEvent } from '@/shared/contexts/SocketContext'
import { BookshelfEntity, BookshelfPageResponse, EntityType, LibraryItem, MediaItemShare, RssFeed } from '@/types/api'

interface UseInfiniteBookshelfProps {
  libraryId: string
  entityType: EntityType
  query: string
  limit: number
}

export interface BookshelfPage {
  results: BookshelfEntity[]
  total: number
  nextPage?: number
}

export function useInfiniteBookshelf({
  libraryId,
  entityType,
  query,
  limit,
}: UseInfiniteBookshelfProps): UseInfiniteQueryResult<InfiniteData<BookshelfPage>, Error> {
  const queryClient = useQueryClient()

  const queryKey = ['bookshelf', libraryId, entityType, query]

  const queryFn = async ({ pageParam = 0 }: { pageParam?: number }): Promise<BookshelfPage> => {
    const pageNum = typeof pageParam === 'number' ? pageParam : 0
    const queryParams = `${query}${query ? '&' : ''}limit=${limit}&page=${pageNum}&minified=1`

    let response: BookshelfPageResponse
    switch (entityType) {
      case 'items':
        response = await fetchLibraryItemsAction(libraryId, queryParams)
        break
      case 'authors':
        response = await fetchAuthorsAction(libraryId, queryParams)
        break
      case 'series':
        response = await fetchSeriesAction(libraryId, queryParams)
        break
      case 'collections':
        response = await fetchCollectionsAction(libraryId, queryParams)
        break
      case 'playlists':
        response = await fetchPlaylistsAction(libraryId, queryParams)
        break
    }

    const results: BookshelfEntity[] = Array.isArray(response?.results)
      ? response.results
      : Array.isArray(response?.authors)
        ? response.authors
        : []
    const total = response?.total ?? results.length

    return {
      results,
      total,
      nextPage: results.length === limit ? pageNum + 1 : undefined,
    }
  }

  const infiniteQuery = useInfiniteQuery<BookshelfPage, Error, InfiniteData<BookshelfPage>, string[], number>({
    queryKey,
    queryFn,
    initialPageParam: 0,
    getNextPageParam: (lastPage: BookshelfPage) => lastPage.nextPage,
  })

  // Real-time updates via Socket.io
  const updateItemInCache = useCallback(
    (updater: (item: BookshelfEntity) => BookshelfEntity) => {
      queryClient.setQueriesData(
        { queryKey: ['bookshelf', libraryId] },
        (oldData: InfiniteData<BookshelfPage> | undefined) => {
          if (!oldData || !Array.isArray(oldData.pages)) return oldData
          return {
            ...oldData,
            pages: oldData.pages.map((page: BookshelfPage) => ({
              ...page,
              results: Array.isArray(page.results) ? page.results.map(updater) : [],
            })),
          }
        }
      )
    },
    [queryClient, libraryId]
  )

  useSocketEvent<MediaItemShare>('share_open', (share) => {
    if (entityType !== 'items') return
    updateItemInCache((item) => {
      const li = item as LibraryItem
      if (li.media?.id === share.mediaItemId) {
        return { ...li, mediaItemShare: share }
      }
      return item
    })
  })

  useSocketEvent<MediaItemShare>('share_closed', (share) => {
    if (entityType !== 'items') return
    updateItemInCache((item) => {
      const li = item as LibraryItem
      if (li.media?.id === share.mediaItemId) {
        return { ...li, mediaItemShare: undefined }
      }
      return item
    })
  })

  useSocketEvent<RssFeed>('rss_feed_open', (feed) => {
    updateItemInCache((item) => {
      if (item.id === feed.entityId) {
        return { ...item, rssFeed: feed }
      }
      return item
    })
  })

  useSocketEvent<RssFeed>('rss_feed_closed', (feed) => {
    updateItemInCache((item) => {
      if (item.id === feed.entityId) {
        return { ...item, rssFeed: undefined }
      }
      return item
    })
  })

  return infiniteQuery
}
