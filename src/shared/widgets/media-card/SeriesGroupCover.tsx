'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCardSize } from '@/features/library/contexts/CardSizeContext'
import { getLibraryItemCoverSrc, getPlaceholderCoverUrl, withCoverRetry } from '@/shared/lib/coverUtils'
import { mergeClasses } from '@/shared/lib/merge-classes'
import type { LibraryItem } from '@/types/api'

interface SeriesGroupCoverProps {
  /** Series name (used as fallback when no covers available) */
  name: string
  /** Books in the series */
  books: (LibraryItem | import('@/types/api/models').SeriesBook)[]
  /** Width of the cover area in pixels */
  width: number
  /** Height of the cover area in pixels */
  height: number
  /** Book cover aspect ratio (1 = square, 1.6 = standard) */
  bookCoverAspectRatio: number
}

interface CoverData {
  id: string
  coverUrl: string
  showCoverBg: boolean
}

interface CoverLoadingState {
  retryCount: number
  failed: boolean
}

const MAX_COVERS = 10
const MAX_RETRIES = 2

export default function SeriesGroupCover({ name, books, width, height, bookCoverAspectRatio }: SeriesGroupCoverProps) {
  const { sizeMultiplier } = useCardSize()
  const [coverData, setCoverData] = useState<CoverData[]>([])
  const [noValidCovers, setNoValidCovers] = useState(false)
  // Track retry/failure state per book id — survives across re-renders without resetting
  const [loadingStates, setLoadingStates] = useState<Map<string, CoverLoadingState>>(new Map())
  const mountedRef = useRef(true)
  const placeholderUrl = useMemo(() => getPlaceholderCoverUrl(), [])

  // Single cover width based on aspect ratio
  const coverWidth = useMemo(() => height / bookCoverAspectRatio, [height, bookCoverAspectRatio])

  // Calculate offset increment for stacking covers
  const offsetIncrement = useMemo(() => {
    const validCount = Math.min(books.length, MAX_COVERS)
    if (validCount <= 1) return 0
    return (width - coverWidth) / (validCount - 1)
  }, [books.length, width, coverWidth])

  const checkImageAspectRatio = useCallback(
    (src: string): Promise<boolean> => {
      return new Promise((resolve) => {
        const image = new Image()
        image.onload = () => {
          const { naturalWidth, naturalHeight } = image
          const aspectRatio = naturalHeight / naturalWidth
          const arDiff = Math.abs(aspectRatio - bookCoverAspectRatio)
          // If image aspect ratio differs by more than 0.15, show background
          resolve(arDiff > 0.15)
        }
        image.onerror = () => resolve(false)
        image.src = src
      })
    },
    [bookCoverAspectRatio]
  )

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Mark a cover as failed after exhausting retries
  const markFailed = useCallback((bookId: string) => {
    if (!mountedRef.current) return
    setLoadingStates((prev) => {
      const next = new Map(prev)
      next.set(bookId, { retryCount: MAX_RETRIES, failed: true })
      return next
    })
  }, [])

  // Increment retry count for a cover
  const incrementRetry = useCallback((bookId: string) => {
    if (!mountedRef.current) return
    setLoadingStates((prev) => {
      const next = new Map(prev)
      const current = next.get(bookId)
      next.set(bookId, { retryCount: (current?.retryCount ?? 0) + 1, failed: false })
      return next
    })
  }, [])

  useEffect(() => {
    async function loadCovers() {
      // Filter books that have covers and haven't permanently failed
      const validBooks = (Array.isArray(books) ? books : [])
        .filter((book) => {
          const state = loadingStates.get(book.id)
          const hasCover = (book as any).media?.coverPath || (book as any).cover
          return !state?.failed && hasCover
        })
        .map((book) => ({
          id: book.id,
          coverUrl: getLibraryItemCoverSrc(book, placeholderUrl),
        }))
        .filter((b) => b.coverUrl !== placeholderUrl)
        .slice(0, MAX_COVERS)

      if (validBooks.length === 0) {
        if (mountedRef.current) {
          setNoValidCovers(true)
          setCoverData([])
        }
        return
      }

      // Force cover background for single cover
      const forceCoverBg = validBooks.length === 1

      // Check aspect ratios for all covers
      const results = await Promise.all(
        validBooks.map(async (book) => ({
          id: book.id,
          coverUrl: book.coverUrl,
          showCoverBg: forceCoverBg || (await checkImageAspectRatio(book.coverUrl)),
        }))
      )

      if (mountedRef.current) {
        setNoValidCovers(false)
        setCoverData(results)
      }
    }

    loadCovers()
  }, [books, checkImageAspectRatio, placeholderUrl, loadingStates])

  // Handle image load error with retry-with-backoff (mirrors MediaCardCover pattern)
  const handleImageError = useCallback(
    (bookId: string, coverUrl: string) => {
      const state = loadingStates.get(bookId)
      const retryCount = state?.retryCount ?? 0

      if (retryCount < MAX_RETRIES) {
        // Retry with a staggered backoff to avoid hammering the rate limit
        const delay = (retryCount + 1) * 1500 + (crypto.getRandomValues(new Uint32Array(1))[0] % 1000)
        setTimeout(() => {
          incrementRetry(bookId)
          // Re-trigger image load by bumping a retry param
          const img = document.querySelector<HTMLImageElement>(`img[data-cover-id="${bookId}"]`)
          if (img) {
            img.src = withCoverRetry(coverUrl, retryCount + 1)
          }
        }, delay)
      } else {
        markFailed(bookId)
      }
    },
    [loadingStates, incrementRetry, markFailed]
  )

  // Fallback when no valid covers
  if (noValidCovers) {
    return (
      <div
        className="box-shadow-book absolute start-0 top-0 flex h-full w-full items-center justify-center bg-gray-400/5"
        style={{ padding: `${sizeMultiplier}em` }}
      >
        <p style={{ fontSize: `${sizeMultiplier}em` }} className="text-center text-white/60">
          {name}
        </p>
      </div>
    )
  }

  return (
    <div className="box-shadow-book relative h-full w-full">
      {coverData.map((cover, index) => {
        const offsetLeft = coverData.length === 1 ? 0 : offsetIncrement * index
        const zIndex = coverData.length - index
        const isLastCover = index === coverData.length - 1
        const displayWidth = coverData.length === 1 ? width : coverWidth
        const state = loadingStates.get(cover.id)
        const retryCount = state?.retryCount ?? 0

        return (
          <div
            key={`${cover.id}-${index}`}
            className="absolute top-0 transition-transform"
            style={{
              height: `${height}px`,
              width: `${displayWidth}px`,
              left: `${offsetLeft}px`,
              zIndex,
              boxShadow: isLastCover ? undefined : '4px 0px 4px #11111166',
            }}
          >
            {/* Cover background for aspect ratio mismatches */}
            {cover.showCoverBg && (
              <div className="bg-primary absolute start-0 top-0 h-full w-full overflow-hidden rounded-xs">
                <div
                  className="cover-bg absolute"
                  style={{
                    backgroundImage: `url("${cover.coverUrl}")`,
                  }}
                />
              </div>
            )}

            {/* Cover image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              data-cover-id={cover.id}
              src={retryCount > 0 ? withCoverRetry(cover.coverUrl, retryCount) : cover.coverUrl}
              alt=""
              aria-hidden="true"
              onError={() => handleImageError(cover.id, cover.coverUrl)}
              className={mergeClasses(
                'absolute start-0 top-0 h-full w-full',
                cover.showCoverBg ? 'object-contain' : 'object-cover'
              )}
            />
          </div>
        )
      })}
    </div>
  )
}
