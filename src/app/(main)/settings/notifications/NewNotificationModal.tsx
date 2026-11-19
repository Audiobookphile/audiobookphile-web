'use client'

import { Bell, Check, Loader2, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { createNotificationAction } from './actions'
import Modal from '@/shared/modals/Modal'
import type { NotificationEvent, NotificationTarget } from '@/types/api'

interface NewNotificationModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (target: NotificationTarget) => void
}

const AVAILABLE_EVENTS: { id: NotificationEvent; label: string; desc: string }[] = [
  {
    id: 'onItemAdded',
    label: 'New Item Added',
    desc: 'Fired when a new audiobook or podcast is added to any library',
  },
  {
    id: 'onItemUpdated',
    label: 'Item Metadata Updated',
    desc: 'Fired when book titles, authors, or chapters are edited',
  },
  {
    id: 'onItemDeleted',
    label: 'Item Deleted',
    desc: 'Fired when an audio track or library item is removed',
  },
  {
    id: 'onUserLogin',
    label: 'User Authentication',
    desc: 'Fired when a listener logs in or creates a new session',
  },
  {
    id: 'onBackupCompleted',
    label: 'Backup Completed',
    desc: 'Fired when an automated database or metadata backup completes',
  },
]

export default function NewNotificationModal({ isOpen, onClose, onCreated }: NewNotificationModalProps) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [authHeader, setAuthHeader] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<NotificationEvent[]>(['onItemAdded'])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleEvent = (event: NotificationEvent) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please provide a webhook name')
      return
    }
    if (!url.trim() || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      setError('Please provide a valid HTTP or HTTPS webhook URL')
      return
    }
    if (selectedEvents.length === 0) {
      setError('Please select at least one event trigger')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const created = await createNotificationAction({
        name: name.trim(),
        url: url.trim(),
        events: selectedEvents,
        enabled: true,
        authHeader: authHeader.trim() ? authHeader.trim() : null,
      })

      if (created) {
        onCreated(created)
        setName('')
        setUrl('')
        setAuthHeader('')
        setSelectedEvents(['onItemAdded'])
        onClose()
      } else {
        setError('Failed to create webhook target')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="sm:max-w-lg md:max-w-xl">
      <div className="flex flex-col p-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Add Webhook Notification</h2>
              <p className="text-xs text-foreground-muted">
                Send real-time JSON payloads to Discord, Slack, or custom endpoints
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-foreground-muted transition-colors hover:bg-white/10 hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Webhook Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">
              Webhook Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Discord #audiobooks"
              className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-foreground-muted/50 focus:border-primary/50 focus:bg-white/10"
              required
            />
          </div>

          {/* Target URL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">
              Webhook URL (POST) <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/... or https://hooks.slack.com/..."
              className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-foreground-muted/50 focus:border-primary/50 focus:bg-white/10"
              required
            />
          </div>

          {/* Optional Authorization Header */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">
              Authorization Header <span className="text-foreground-muted font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={authHeader}
              onChange={(e) => setAuthHeader(e.target.value)}
              placeholder="e.g. Bearer my-secret-token"
              className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-foreground-muted/50 focus:border-primary/50 focus:bg-white/10"
            />
          </div>

          {/* Event Triggers */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-foreground">
              Event Triggers <span className="text-red-400">*</span>
            </label>
            <div className="flex flex-col gap-2">
              {AVAILABLE_EVENTS.map((ev) => {
                const isChecked = selectedEvents.includes(ev.id)
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => toggleEvent(ev.id)}
                    className={`flex items-start gap-3 rounded-xl border p-2.5 text-left transition-all ${
                      isChecked
                        ? 'border-primary/40 bg-primary/10 shadow-sm'
                        : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md border ${
                        isChecked
                          ? 'border-primary bg-primary text-white'
                          : 'border-white/20 bg-white/5'
                      }`}
                    >
                      {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-foreground">{ev.label}</span>
                      <span className="text-[11px] text-foreground-muted">{ev.desc}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-2 flex items-center justify-end gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-foreground-muted transition-colors hover:bg-white/10 hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary px-4 py-2 text-xs font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Add Webhook
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
