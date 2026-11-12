'use client'

import { AlertTriangle, BookOpen, CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import Modal from '@/shared/modals/Modal'

export interface ChapterAIModalProps {
  isOpen: boolean
  onClose: () => void
  bookTitle: string
  bookAuthor?: string
  chapterTitle: string
  chapterIndex?: number
}

interface AIInsights {
  summary: string
  keyTakeaways: string[]
  mood?: string
}

export default function ChapterAIModal({
  isOpen,
  onClose,
  bookTitle,
  bookAuthor,
  chapterTitle,
  chapterIndex,
}: ChapterAIModalProps) {
  const [insights, setInsights] = useState<AIInsights | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    setIsLoading(true)
    setError(null)
    setInsights(null)

    const fetchInsights = async () => {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

        const endpoint = supabaseUrl ? `${supabaseUrl}/functions/v1/api/chapter-ai` : '/api/chapter-ai'

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(anonKey ? { apikey: anonKey, Authorization: `Bearer ${anonKey}` } : {}),
          },
          body: JSON.stringify({
            title: bookTitle,
            author: bookAuthor || 'Unknown Author',
            chapterTitle,
            chapterIndex: chapterIndex || 1,
          }),
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.error || `HTTP error ${response.status}`)
        }

        const data = await response.json()
        if (data.insights) {
          setInsights(data.insights)
        } else {
          throw new Error('No insights returned from AI service')
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to generate AI insights'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    void fetchInsights()
  }, [isOpen, bookTitle, bookAuthor, chapterTitle, chapterIndex])

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-6 text-white">
        {/* Header Metadata */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-cyan-400">
              <Sparkles className="h-5 w-5 animate-pulse" />
              <span className="text-sm font-semibold tracking-wide uppercase">AI Companion</span>
            </div>
            <h3 className="text-xl font-bold text-white">
              Chapter {chapterIndex ? `${chapterIndex}: ` : ''}
              {chapterTitle}
            </h3>
            <p className="flex items-center gap-1.5 text-sm text-neutral-400">
              <BookOpen className="h-4 w-4 text-neutral-500" />
              <span>{bookTitle}</span> {bookAuthor ? `by ${bookAuthor}` : ''}
            </p>
          </div>

          {insights?.mood && (
            <span className="rounded-full border border-purple-500/30 bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-300 shadow-lg shadow-purple-500/10">
              {insights.mood}
            </span>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center space-y-4 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            <p className="text-sm text-neutral-400">Generating chapter insights with AI...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-amber-200">Unable to load insights</p>
              <p className="mt-1 text-xs text-amber-300/80">{error}</p>
            </div>
          </div>
        )}

        {/* AI Insights Content */}
        {insights && !isLoading && (
          <div className="space-y-6">
            {/* Executive Summary */}
            <div className="space-y-2 rounded-xl border border-cyan-500/20 bg-neutral-900/60 p-4 backdrop-blur-md">
              <h4 className="text-sm font-semibold tracking-wider text-cyan-400 uppercase">Executive Summary</h4>
              <p className="text-sm leading-relaxed text-neutral-200">{insights.summary}</p>
            </div>

            {/* Key Takeaways */}
            {insights.keyTakeaways && insights.keyTakeaways.length > 0 && (
              <div className="space-y-3 rounded-xl border border-purple-500/20 bg-neutral-900/60 p-4 backdrop-blur-md">
                <h4 className="text-sm font-semibold tracking-wider text-purple-400 uppercase">Key Takeaways</h4>
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
          </div>
        )}
      </div>
    </Modal>
  )
}
