'use client'

import { AlertTriangle, BookOpen, CheckCircle2, Database, Loader2, Sparkles, Tag, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import Modal from '@/shared/modals/Modal'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/shared/utils/supabase/env'

export interface BookAIModalProps {
  isOpen: boolean
  onClose: () => void
  bookId: string
  bookTitle: string
  bookAuthor?: string
}

interface BookAIInsights {
  bookId: string
  title: string
  author: string | null
  summary: string
  keyTakeaways: string[]
  mood: string
  themes: string[]
  isCached: boolean
}

export default function BookAIModal({ isOpen, onClose, bookId, bookTitle, bookAuthor }: BookAIModalProps) {
  const [insights, setInsights] = useState<BookAIInsights | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !bookId) return

    setIsLoading(true)
    setError(null)
    setInsights(null)

    const fetchInsights = async () => {
      try {
        const supabaseUrl = getSupabaseUrl()
        const anonKey = getSupabaseAnonKey()

        const endpoint = supabaseUrl ? `${supabaseUrl}/functions/v1/api/ai/insights` : '/api/ai/insights'

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(anonKey ? { apikey: anonKey, Authorization: `Bearer ${anonKey}` } : {}),
          },
          body: JSON.stringify({
            bookId,
            title: bookTitle,
            author: bookAuthor || null,
          }),
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.error || `HTTP error ${response.status}`)
        }

        const data = await response.json()
        if (data.summary) {
          setInsights(data)
        } else {
          throw new Error('Invalid response structure from AI insights service')
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to generate book AI insights'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    void fetchInsights()
  }, [isOpen, bookId, bookTitle, bookAuthor])

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-6 text-white">
        {/* Header Metadata */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-cyan-400">
              <Sparkles className="h-5 w-5 animate-pulse text-cyan-400" />
              <span className="text-sm font-semibold tracking-wide uppercase">Book AI Insights Engine</span>
            </div>
            <h3 className="text-xl font-bold text-white">{bookTitle}</h3>
            <p className="flex items-center gap-1.5 text-sm text-neutral-400">
              <BookOpen className="h-4 w-4 text-neutral-500" />
              <span>{bookAuthor ? `by ${bookAuthor}` : 'Unknown Author'}</span>
            </p>
          </div>

          {insights && (
            <div className="flex flex-col items-end gap-2">
              <span className="rounded-full border border-purple-500/30 bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-300 shadow-lg shadow-purple-500/10">
                {insights.mood}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-neutral-400">
                {insights.isCached ? (
                  <>
                    <Database className="h-3 w-3 text-cyan-400" />
                    <span>DB Cached</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-3 w-3 text-emerald-400" />
                    <span>Live AI</span>
                  </>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center space-y-4 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            <p className="text-sm text-neutral-400">Analyzing book content & compiling insights...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-amber-200">Unable to load book insights</p>
              <p className="mt-1 text-xs text-amber-300/80">{error}</p>
            </div>
          </div>
        )}

        {/* AI Insights Content */}
        {insights && !isLoading && (
          <div className="space-y-6">
            {/* Executive Summary */}
            <div className="space-y-2 rounded-xl border border-cyan-500/20 bg-neutral-900/60 p-4 backdrop-blur-md">
              <h4 className="text-sm font-semibold tracking-wider text-cyan-400 uppercase">Book Executive Summary</h4>
              <p className="text-sm leading-relaxed text-neutral-200">{insights.summary}</p>
            </div>

            {/* Key Takeaways */}
            {insights.keyTakeaways && insights.keyTakeaways.length > 0 && (
              <div className="space-y-3 rounded-xl border border-purple-500/20 bg-neutral-900/60 p-4 backdrop-blur-md">
                <h4 className="text-sm font-semibold tracking-wider text-purple-400 uppercase">
                  Key Takeaways & Highlights
                </h4>
                <ul className="space-y-2.5">
                  {insights.keyTakeaways.map((takeaway, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-neutral-300">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                      <span>{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Themes */}
            {insights.themes && insights.themes.length > 0 && (
              <div className="space-y-3 rounded-xl border border-emerald-500/20 bg-neutral-900/60 p-4 backdrop-blur-md">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Tag className="h-4 w-4" />
                  <h4 className="text-sm font-semibold tracking-wider uppercase">Narrative Themes</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {insights.themes.map((theme, idx) => (
                    <span
                      key={idx}
                      className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
