'use client'

import { Bookmark, ChevronDown, Clock, Download, FileJson, FileSpreadsheet, FileText, Loader2, MessageSquare, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { UsePlayerHandlerReturn } from '@/features/player/hooks/usePlayerHandler'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { getServerBaseUrl } from '@/shared/lib/api/base'
import { apiFetch } from '@/shared/lib/api/browser'
import { secondsToTimestamp } from '@/shared/lib/datefns'
import { mergeClasses } from '@/shared/lib/merge-classes'
import Modal from '@/shared/modals/Modal'
import { getSupabaseAnonKey } from '@/shared/utils/supabase/env'

interface BookmarksModalProps {
  isOpen: boolean
  libraryItemId: string | null
  playerHandler: UsePlayerHandlerReturn
  onClose: () => void
}

interface BookmarkItem {
  id: string
  library_item_id: string
  time_pos: number
  title: string | null
  note?: string | null
  created_at?: string
}

export default function BookmarksModal({
  isOpen,
  libraryItemId,
  playerHandler,
  onClose,
}: BookmarksModalProps) {
  const t = useTypeSafeTranslations()
  const { currentTime } = playerHandler.state
  const { seek } = playerHandler.controls

  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newNote, setNewNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false)

  const fetchBookmarks = useCallback(async () => {
    if (!libraryItemId) return
    setIsLoading(true)
    try {
      const res = await apiFetch<{ bookmarks: BookmarkItem[] }>(
        `/api/me/bookmarks?libraryItemId=${libraryItemId}`,
        {}
      )
      if (res.ok && res.data?.bookmarks) {
        setBookmarks(res.data.bookmarks)
      }
    } catch (err) {
      console.error('[BookmarksModal] Failed to fetch bookmarks:', err)
    } finally {
      setIsLoading(false)
    }
  }, [libraryItemId])

  useEffect(() => {
    if (isOpen && libraryItemId) {
      void fetchBookmarks()
      setIsAdding(false)
      setNewTitle('')
      setNewNote('')
    }
  }, [isOpen, libraryItemId, fetchBookmarks])

  const handleStartAdd = () => {
    setNewTitle(`Bookmark at ${secondsToTimestamp(currentTime)}`)
    setNewNote('')
    setIsAdding(true)
  }

  const handleSaveBookmark = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!libraryItemId || isSaving) return

    setIsSaving(true)
    try {
      const payload = {
        library_item_id: libraryItemId,
        time_pos: Math.round(currentTime * 1000), // ms
        title: newTitle.trim() || null,
        note: newNote.trim() || null,
      }

      const res = await apiFetch<{ bookmark: BookmarkItem }>('/api/me/bookmarks', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      if (res.ok && res.data?.bookmark) {
        setBookmarks((prev) => [...prev, res.data.bookmark].sort((a, b) => a.time_pos - b.time_pos))
        setIsAdding(false)
        setNewTitle('')
        setNewNote('')
      }
    } catch (err) {
      console.error('[BookmarksModal] Failed to create bookmark:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteBookmark = async (bookmarkId: string) => {
    try {
      const res = await apiFetch(`/api/me/bookmarks/${bookmarkId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId))
      }
    } catch (err) {
      console.error('[BookmarksModal] Failed to delete bookmark:', err)
    }
  }

  const handleSeek = (timePosMs: number) => {
    seek(timePosMs / 1000)
    onClose()
  }

  const handleExport = async (format: 'markdown' | 'csv' | 'json') => {
    if (!libraryItemId || isExporting) return
    setIsExporting(true)
    setExportDropdownOpen(false)
    try {
      const { createClient } = await import('@/shared/utils/supabase/client')
      const supabase = createClient()
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      const anonKey = getSupabaseAnonKey()
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      if (anonKey) headers['apikey'] = anonKey

      const baseUrl = getServerBaseUrl()
      const res = await fetch(
        `${baseUrl}/api/me/bookmarks/export?libraryItemId=${encodeURIComponent(libraryItemId)}&format=${format}`,
        { headers }
      )
      if (!res.ok) throw new Error(`Export failed with status ${res.status}`)

      let filename = `bookmarks.${format === 'markdown' ? 'md' : format}`
      const disposition = res.headers.get('content-disposition')
      if (disposition) {
        const match = disposition.match(/filename="?([^";]+)"?/i)
        if (match?.[1]) filename = match[1]
      }

      const blob = await res.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(downloadUrl)
    } catch (err) {
      console.error('[BookmarksModal] Failed to export bookmarks:', err)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="sm:max-w-lg md:max-w-lg lg:max-w-lg">
      <div className="flex max-h-[80vh] flex-col p-4">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-foreground-muted/10 pb-3">
          <div className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              {t('LabelViewBookmarks') || 'Bookmarks'}
            </h2>
            {bookmarks.length > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {bookmarks.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {bookmarks.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setExportDropdownOpen((prev) => !prev)}
                  disabled={isExporting}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-white/10 hover:border-white/20 active:scale-95 disabled:opacity-50"
                  title="Export bookmarks"
                >
                  {isExporting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  ) : (
                    <Download className="h-3.5 w-3.5 text-primary" />
                  )}
                  <span>Export</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>

                {exportDropdownOpen && (
                  <div className="absolute right-0 top-full z-50 mt-1.5 w-44 rounded-xl border border-white/15 bg-background/95 p-1 shadow-xl backdrop-blur-xl">
                    <button
                      type="button"
                      onClick={() => void handleExport('markdown')}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      <span>Markdown (.md)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleExport('csv')}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                      <span>Spreadsheet (.csv)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleExport('json')}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      <FileJson className="h-3.5 w-3.5 text-primary" />
                      <span>Structured (.json)</span>
                    </button>
                  </div>
                )}
              </div>
            )}
            {!isAdding && (
              <button
                type="button"
                onClick={handleStartAdd}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/25 active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add at {secondsToTimestamp(currentTime)}</span>
              </button>
            )}
          </div>
        </div>

        {/* Add Form */}
        {isAdding && (
          <form
            onSubmit={handleSaveBookmark}
            className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Clock className="h-3.5 w-3.5" />
                Position: {secondsToTimestamp(currentTime)}
              </span>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-xs text-foreground-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground-muted">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Bookmark title..."
                  className="mt-1 w-full rounded-lg border border-foreground-muted/20 bg-background/80 px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground-muted">
                  Notes & Commentary
                </label>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add multi-line quote or notes..."
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-foreground-muted/20 bg-background/80 px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-foreground-muted hover:bg-foreground-muted/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Bookmark'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Bookmarks List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-foreground-muted">Loading bookmarks...</div>
          ) : bookmarks.length === 0 && !isAdding ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-foreground-muted">
              <Bookmark className="mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm font-medium">No bookmarks yet</p>
              <p className="mt-1 max-w-xs text-xs opacity-75">
                Save key moments, quotes, and multi-line notes as you listen.
              </p>
              <button
                type="button"
                onClick={handleStartAdd}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-white shadow-sm hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                <span>Bookmark at {secondsToTimestamp(currentTime)}</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {bookmarks.map((bm) => {
                const timeSec = bm.time_pos / 1000
                const formattedTime = secondsToTimestamp(timeSec)

                return (
                  <div
                    key={bm.id}
                    className={mergeClasses(
                      'group flex items-start justify-between gap-3 rounded-lg border border-foreground-muted/10 p-3 transition-colors',
                      'hover:border-primary/20 hover:bg-foreground-muted/5'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleSeek(bm.time_pos)}
                      className="flex flex-1 items-start gap-3 text-left"
                    >
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary/10 px-2 py-1 font-mono text-xs font-medium text-primary">
                        <Clock className="h-3 w-3" />
                        {formattedTime}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary">
                          {bm.title || `Bookmark at ${formattedTime}`}
                        </p>
                        {bm.note && (
                          <div className="mt-1 flex items-start gap-1.5 text-xs text-foreground-muted">
                            <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 opacity-60" />
                            <p className="whitespace-pre-wrap leading-relaxed">{bm.note}</p>
                          </div>
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteBookmark(bm.id)}
                      className="shrink-0 rounded p-1 text-foreground-muted/40 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      title="Delete bookmark"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
