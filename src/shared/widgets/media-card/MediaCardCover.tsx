'use client'

import { motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getLibraryItemCoverSrc, withCoverRetry } from '@/shared/lib/coverUtils'
import { mergeClasses } from '@/shared/lib/merge-classes'
import type { LibraryItem } from '@/types/api'

interface MediaCardCoverProps {
  libraryItem: LibraryItem
  coverAspect: number
  placeholderUrl: string
  hasCover: boolean
  title: string
  titleCleaned: string
  authorCleaned: string
  isPodcast: boolean
  userProgressPercent: number
  itemIsFinished: boolean
  onImageLoad?: (showBg: boolean) => void
  isHovering?: boolean
}

const PLACEHOLDER_COVER_PADDING = 0.8
const TITLE_FONT_SIZE = 0.8
const AUTHOR_FONT_SIZE = 0.65
const AUTHOR_BOTTOM = 1

export default function MediaCardCover({
  libraryItem,
  coverAspect,
  placeholderUrl,
  hasCover,
  title,
  titleCleaned,
  authorCleaned,
  isPodcast,
  userProgressPercent,
  itemIsFinished,
  onImageLoad,
  isHovering = false,
}: MediaCardCoverProps) {
  const [imageReady, setImageReady] = useState(false)
  const [showCoverBg, setShowCoverBg] = useState(false)
  const [imageError, setImageError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const hasHandledLoad = useRef(false)

  const [retryCount, setRetryCount] = useState(0)

  // Determine if we should even attempt to show the cover.
  // We ALWAYS attempt to fetch the cover at least once, because the backend will dynamically
  // fetch it from third party APIs on the fly if it's missing.
  const shouldAttemptCover = !imageError

  const baseCoverSrc = useMemo(() => getLibraryItemCoverSrc(libraryItem, placeholderUrl), [libraryItem, placeholderUrl])
  const bookCoverSrc = useMemo(() => withCoverRetry(baseCoverSrc, retryCount), [baseCoverSrc, retryCount])

  const [prevBaseSrc, setPrevBaseSrc] = useState(baseCoverSrc)

  useEffect(() => {
    if (baseCoverSrc !== prevBaseSrc) {
      setPrevBaseSrc(baseCoverSrc)
      setImageReady(false)
      setImageError(false)
      setRetryCount(0)
      hasHandledLoad.current = false
    }
  }, [baseCoverSrc, prevBaseSrc])

  const handleImageError = useCallback(() => {
    if (retryCount < 2) {
      // Retry with a staggered backoff to avoid hammering the rate limit
      const delay = (retryCount + 1) * 1500 + (crypto.getRandomValues(new Uint32Array(1))[0] % 1000)
      setTimeout(() => {
        setRetryCount((c) => c + 1)
      }, delay)
    } else {
      setImageError(true)
      setImageReady(false)
    }
  }, [retryCount])

  const handleImageLoaded = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      if (hasHandledLoad.current) return
      hasHandledLoad.current = true

      const img = event.currentTarget
      setImageReady(true)

      if (bookCoverSrc !== placeholderUrl) {
        const { naturalWidth, naturalHeight } = img
        const aspectRatio = naturalHeight / naturalWidth
        const arDiff = Math.abs(aspectRatio - coverAspect)

        const shouldShowBg = arDiff > 0.15
        setShowCoverBg(shouldShowBg)
        onImageLoad?.(shouldShowBg)
      }
    },
    [bookCoverSrc, coverAspect, placeholderUrl, onImageLoad]
  )

  useEffect(() => {
    const img = imgRef.current
    if (img && img.complete && img.naturalWidth > 0) {
      handleImageLoaded({ currentTarget: img } as React.SyntheticEvent<HTMLImageElement>)
    }
  }, [bookCoverSrc, handleImageLoaded])

  return (
    <>
      {/* Cover background when image does not fill */}
      <div
        cy-id="coverBg"
        className="absolute start-0 top-0 h-full w-full overflow-hidden bg-black/40"
        style={{ display: showCoverBg ? 'block' : 'none' }}
      >
        {showCoverBg && (
          <motion.div
            animate={{ scale: isHovering ? 1.15 : 1.1, opacity: 0.3 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="cover-bg absolute inset-0 blur-2xl saturate-150"
            style={{
              backgroundImage: `url("${bookCoverSrc}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        )}
      </div>

      {/* Placeholder title when image is not ready */}
      {libraryItem && !imageReady && !imageError && shouldAttemptCover && (
        <div
          cy-id="titleImageNotReady"
          aria-hidden="true"
          className="absolute start-0 top-0 flex h-full w-full items-center justify-center bg-white/5"
          style={{ padding: '1rem' }}
        >
          <p className="text-foreground/20 text-center text-[10px] font-black tracking-widest uppercase">{title}</p>
        </div>
      )}

      {/* Cover image */}
      {libraryItem && shouldAttemptCover && (
        <motion.img
          ref={imgRef}
          cy-id="coverImage"
          alt={`${title}, Cover`}
          aria-hidden="true"
          src={bookCoverSrc}
          loading="lazy"
          onLoad={handleImageLoaded}
          onError={handleImageError}
          animate={{
            opacity: imageReady ? 1 : 0,
            scale: isHovering ? 1.08 : 1,
          }}
          transition={{
            opacity: { duration: 0.4 },
            scale: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
          }}
          className={mergeClasses(
            'absolute inset-0 h-full w-full transition-shadow duration-500',
            showCoverBg ? 'object-contain' : 'object-cover',
            isHovering ? 'shadow-2xl' : 'shadow-none'
          )}
          style={{ viewTransitionName: `cover-${libraryItem.id}` }}
        />
      )}

      {/* Placeholder cover title & author */}
      {!shouldAttemptCover && (
        <div
          className="from-primary/20 to-primary/5 absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br p-4 text-center"
          style={{ viewTransitionName: `cover-${libraryItem.id}` }}
        >
          <div cy-id="placeholderTitle" className="flex flex-1 items-center justify-center">
            <p
              cy-id="placeholderTitleText"
              aria-hidden="true"
              className="text-primary/80 leading-tight font-black tracking-widest uppercase drop-shadow-sm"
              style={{ fontSize: `${TITLE_FONT_SIZE}em` }}
            >
              {titleCleaned}
            </p>
          </div>
          <div cy-id="placeholderAuthor" className="w-full pb-2">
            <p
              cy-id="placeholderAuthorText"
              aria-hidden="true"
              className="text-primary/40 font-bold tracking-widest uppercase"
              style={{ fontSize: `${AUTHOR_FONT_SIZE}em` }}
            >
              {authorCleaned}
            </p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {userProgressPercent > 0 && (!isPodcast || !!libraryItem.recentEpisode) && (
        <div className="absolute start-0 bottom-0 z-20 w-full px-2 pb-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10 shadow-inner backdrop-blur-sm">
            <motion.div
              cy-id="progressBar"
              initial={{ width: 0 }}
              animate={{ width: `${userProgressPercent * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={mergeClasses(
                'h-full rounded-full transition-all duration-500',
                itemIsFinished
                  ? 'bg-success shadow-[0_0_10px_rgba(76,175,80,0.5)]'
                  : 'bg-accent shadow-[0_0_10px_rgba(245,158,11,0.5)]'
              )}
            />
          </div>
        </div>
      )}
    </>
  )
}
