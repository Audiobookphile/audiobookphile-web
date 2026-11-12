'use client'

import { User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { mergeClasses } from '@/shared/lib/merge-classes'
import type { Author } from '@/types/api'

interface AuthorImageProps {
  author: Author
  className?: string
}

/**
 * AuthorImage component - displays author image or SVG placeholder
 */
export default function AuthorImage({ author, className }: AuthorImageProps) {
  const [imageError, setImageError] = useState(false)
  const [showCoverBg, setShowCoverBg] = useState(false)
  const fallbackUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/api`
    : 'http://localhost:54321/functions/v1/api'
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || fallbackUrl
  const rawImageSrc = `${apiUrl}/authors/${author.id}/image`
  const imageSrc = author.updatedAt ? `${rawImageSrc}?ts=${new Date(author.updatedAt).getTime()}` : rawImageSrc

  // Reset state when author or image source changes
  useEffect(() => {
    setImageError(false)
    setShowCoverBg(false)
  }, [author.id, author.imagePath, imageSrc])

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const aspectRatio = img.naturalHeight / img.naturalWidth
    // Reset error state when image loads successfully
    setImageError(false)
    // Show background blur if aspect ratio is too extreme, otherwise hide it
    setShowCoverBg(aspectRatio < 0.5 || aspectRatio > 2)
  }

  const handleImageError = () => {
    setImageError(true)
  }

  // SVG placeholder when no image
  if (!imageSrc || imageError) {
    return (
      <div
        className={mergeClasses(
          'bg-primary/50 flex h-full w-full items-center justify-center overflow-hidden rounded-lg',
          className
        )}
      >
        <User className="text-muted-foreground/50 h-1/3 w-1/3" />
      </div>
    )
  }

  return (
    <div className={mergeClasses('bg-primary relative h-full w-full overflow-hidden rounded-md', className)}>
      {showCoverBg && (
        <div
          className="cover-bg absolute start-0 top-0 h-full w-full"
          style={{ backgroundImage: `url(${imageSrc})` }}
          aria-hidden="true"
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt=""
        onLoad={handleImageLoad}
        onError={handleImageError}
        className={mergeClasses(
          'absolute start-0 top-0 h-full w-full',
          showCoverBg ? 'object-contain' : 'object-cover'
        )}
      />
    </div>
  )
}
