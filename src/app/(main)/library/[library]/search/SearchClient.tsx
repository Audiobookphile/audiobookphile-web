'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useTransition } from 'react'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { getLibraryItemCoverSrc, getPlaceholderCoverUrl } from '@/shared/lib/coverUtils'
import Btn from '@/shared/ui/Btn'
import { sanitizeDisplayTitle } from '@/shared/utils/titleAuthorParser'

interface SearchClientProps {
  libraryId: string
  initialQuery: string
  initialResults: any
}

export default function SearchClient({ libraryId, initialQuery, initialResults }: SearchClientProps) {
  const t = useTypeSafeTranslations()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const handleSearch = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const formData = new FormData(e.currentTarget)
      const q = (formData.get('q') as string) || ''
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (q) {
          params.set('q', q)
        } else {
          params.delete('q')
        }
        router.push(`/library/${libraryId}/search?${params.toString()}`)
      })
    },
    [libraryId, router, searchParams]
  )

  const items = useMemo(() => {
    const candidate = initialResults?.results ?? initialResults?.items
    return Array.isArray(candidate) ? candidate : []
  }, [initialResults])

  const placeholder = getPlaceholderCoverUrl()

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">{t('ButtonSearch')}</h1>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-8 flex gap-2">
        <input
          name="q"
          type="search"
          defaultValue={initialQuery}
          placeholder={t('ButtonSearch')}
          className="bg-bg-light border-border focus:ring-primary flex-1 rounded-md border px-4 py-2 text-sm focus:ring-2 focus:outline-none"
          autoFocus
        />
        <Btn type="submit" loading={isPending} disabled={isPending} size="small">
          {t('ButtonSearch')}
        </Btn>
      </form>

      {/* AI Smart Search Quick Filter Pills */}
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs font-semibold text-cyan-400">
          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
          AI Filters:
        </span>
        {[
          { label: '🚀 Sci-Fi & Space', query: 'Sci-Fi Space' },
          { label: '🕵️ Mystery & Thriller', query: 'Mystery Thriller' },
          { label: '💡 Self-Growth & Focus', query: 'Productivity' },
          { label: '⚔️ High Fantasy', query: 'Fantasy' },
          { label: '🧠 Mind & Philosophy', query: 'Philosophy' },
        ].map((pill) => (
          <button
            key={pill.label}
            type="button"
            onClick={() => {
              startTransition(() => {
                const params = new URLSearchParams(searchParams.toString())
                params.set('q', pill.query)
                router.push(`/library/${libraryId}/search?${params.toString()}`)
              })
            }}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-md transition-all hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-cyan-300 active:scale-95"
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {initialQuery && (
        <p className="text-foreground-muted mb-4 text-sm">
          {items.length === 0
            ? `No results for "${initialQuery}"`
            : `${items.length} result${items.length !== 1 ? 's' : ''} for "${initialQuery}"`}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {items.map((item: any) => {
          const itemId = item.id
          if (!itemId) return null

          const title = sanitizeDisplayTitle(item.media?.metadata?.title || item.title || 'Unknown')
          const author = item.media?.metadata?.authorName || item.author_names_first_last || ''
          const coverSrc = getLibraryItemCoverSrc(
            { id: itemId, updatedAt: item.updatedAt ?? item.updated_at, coverPath: item.coverPath ?? item.cover_path },
            placeholder
          )

          return (
            <Link key={itemId} href={`/library/${libraryId}/item/${itemId}`} className="group flex flex-col gap-1">
              <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverSrc}
                  alt={title}
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src = placeholder
                  }}
                />
              </div>
              <p className="text-foreground line-clamp-2 text-xs font-medium">{title}</p>
              {author && <p className="text-foreground-muted line-clamp-1 text-xs">{author}</p>}
            </Link>
          )
        })}
      </div>

      {!initialQuery && (
        <div className="flex h-48 items-center justify-center">
          <p className="text-foreground-muted text-sm">{t('MessageNoResults')}</p>
        </div>
      )}
    </div>
  )
}
