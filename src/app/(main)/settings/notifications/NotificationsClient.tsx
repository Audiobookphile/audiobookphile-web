'use client'

import { Bell, CheckCircle2, Clock, Globe, Plus, Send, Trash2, XCircle } from 'lucide-react'
import { useState } from 'react'
import { deleteNotificationAction, testWebhookAction, type TestWebhookResult } from './actions'
import NewNotificationModal from './NewNotificationModal'
import { mergeClasses } from '@/shared/lib/merge-classes'
import type { NotificationTarget } from '@/types/api'

interface NotificationsClientProps {
  initialNotifications: NotificationTarget[]
}

const EVENT_LABELS: Record<string, string> = {
  onItemAdded: 'New Item Added',
  onItemUpdated: 'Metadata Updated',
  onItemDeleted: 'Item Deleted',
  onUserLogin: 'User Login',
  onBackupCompleted: 'Backup Completed',
  onTest: 'Test Event',
}

export default function NotificationsClient({ initialNotifications }: NotificationsClientProps) {
  const [notifications, setNotifications] = useState<NotificationTarget[]>(initialNotifications)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, TestWebhookResult>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleCreated = (newTarget: NotificationTarget) => {
    setNotifications((prev) => [newTarget, ...prev])
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this webhook notification?')) return
    setDeletingId(id)
    try {
      const ok = await deleteNotificationAction(id)
      if (ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
      }
    } finally {
      setDeletingId(null)
    }
  }

  const handleTestPing = async (target: NotificationTarget) => {
    setTestingId(target.id)
    try {
      const result = await testWebhookAction({ id: target.id, url: target.url })
      setTestResults((prev) => ({ ...prev, [target.id]: result }))
    } finally {
      setTestingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-lg backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <Bell className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-base font-bold text-foreground">Webhook Notifications</h2>
            <p className="text-xs text-foreground-muted">
              Publish automated JSON events to Discord channels, Slack incoming webhooks, or custom APIs.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-primary px-4 py-2 text-xs font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 active:scale-98"
        >
          <Plus className="h-4 w-4" />
          Add Webhook
        </button>
      </div>

      {/* Webhook Targets List */}
      <div className="flex flex-col gap-3">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-foreground-muted">
              <Globe className="h-6 w-6 opacity-60" />
            </div>
            <p className="text-sm font-semibold text-foreground">No Webhooks Configured</p>
            <p className="mt-1 max-w-sm text-xs text-foreground-muted">
              Connect external services to get notified immediately when new audiobooks or podcasts are added to your
              libraries.
            </p>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-foreground transition-all hover:border-primary/40 hover:bg-primary/15 hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              Configure First Webhook
            </button>
          </div>
        ) : (
          notifications.map((target) => {
            const isTesting = testingId === target.id
            const isDeleting = deletingId === target.id
            const testResult = testResults[target.id]

            return (
              <div
                key={target.id}
                className={mergeClasses(
                  'group flex flex-col gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4 transition-all hover:border-white/15 hover:bg-white/[0.05] sm:flex-row sm:items-center sm:justify-between',
                  isDeleting && 'opacity-40 pointer-events-none'
                )}
              >
                {/* Info & URL */}
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold text-foreground">{target.name}</span>
                    <span
                      className={mergeClasses(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        target.enabled
                          ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                          : 'bg-white/5 text-foreground-muted'
                      )}
                    >
                      {target.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono text-xs text-foreground-muted">
                    <Globe className="h-3 w-3 shrink-0 opacity-60" />
                    <span className="truncate">{target.url}</span>
                  </div>

                  {/* Subscribed Event Chips */}
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {target.events.map((ev) => (
                      <span
                        key={ev}
                        className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-foreground-muted"
                      >
                        {EVENT_LABELS[ev] || ev}
                      </span>
                    ))}
                  </div>

                  {/* Test Ping Status Banner */}
                  {testResult && (
                    <div
                      className={mergeClasses(
                        'mt-1.5 flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs',
                        testResult.success
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400'
                      )}
                    >
                      {testResult.success ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span>
                        Status: {testResult.status} ({testResult.latencyMs}ms) • {testResult.message}
                      </span>
                    </div>
                  )}
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => handleTestPing(target)}
                    disabled={isTesting}
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-foreground transition-all hover:border-primary/40 hover:bg-primary/15 hover:text-primary disabled:opacity-50"
                    title="Send Test Ping"
                  >
                    {isTesting ? (
                      <>
                        <Clock className="h-3.5 w-3.5 animate-spin" />
                        Pinging...
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        Test Ping
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(target.id)}
                    disabled={isDeleting}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-foreground-muted transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                    title="Delete Webhook"
                    aria-label={`Delete ${target.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add Modal */}
      <NewNotificationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}
