import type { Chapter } from '@/types/api'
import { copyToClipboard } from './clipboard'

export interface ChapterLinkOptions {
  chapter: Chapter
  itemId?: string
  baseUrl?: string
}

/**
 * Builds a shareable web URL pointing to a specific chapter timestamp.
 */
export function buildChapterTimestampUrl(options: ChapterLinkOptions): string {
  const { chapter, itemId, baseUrl } = options
  const startSeconds = Math.round(chapter.start)

  if (baseUrl) {
    try {
      const url = new URL(baseUrl)
      url.searchParams.set('t', startSeconds.toString())
      return url.toString()
    } catch {
      return `${baseUrl}?t=${startSeconds}`
    }
  }

  if (typeof window !== 'undefined') {
    try {
      if (itemId && !window.location.pathname.includes(`/item/${itemId}`)) {
        const url = new URL(`/item/${itemId}`, window.location.origin)
        url.searchParams.set('t', startSeconds.toString())
        return url.toString()
      }
      const url = new URL(window.location.href)
      url.searchParams.set('t', startSeconds.toString())
      return url.toString()
    } catch {
      return `?t=${startSeconds}`
    }
  }

  return itemId ? `/item/${itemId}?t=${startSeconds}` : `?t=${startSeconds}`
}

/**
 * Copies a chapter's timestamp link to the clipboard.
 * Returns the copied URL.
 */
export async function copyChapterTimestampLink(options: ChapterLinkOptions): Promise<string> {
  const url = buildChapterTimestampUrl(options)
  await copyToClipboard(url)
  return url
}

