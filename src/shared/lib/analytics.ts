'use client'

// ---------------------------------------------------------------------------
// Single facade for PostHog product analytics and feature flags.
//
// Every analytics call in the app goes through this module so that event
// names stay in one schema, the tracker can be swapped, and everything is a
// silent no-op when PostHog is not configured (local dev, CI, previews).
//
// Event names follow snake_case per the observability standard and are shared
// across web and mobile: playback_started, playback_paused, book_completed,
// download_completed, search_performed, auth_failed, ...
// ---------------------------------------------------------------------------

import type { PostHog } from 'posthog-js'
import { useEffect, useState } from 'react'

/** Whether PostHog is configured for this build (evaluated at module load). */
export const posthogEnabled = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_KEY &&
  process.env.NEXT_PUBLIC_POSTHOG_KEY !== 'phc_placeholder' &&
  !process.env.NEXT_PUBLIC_POSTHOG_KEY.includes('placeholder')
)

/**
 * Live re-check of the same condition, used at call time so no-op behavior is
 * deterministic per environment (and testable without module-cache tricks).
 */
function isPostHogEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_POSTHOG_KEY &&
    process.env.NEXT_PUBLIC_POSTHOG_KEY !== 'phc_placeholder' &&
    !process.env.NEXT_PUBLIC_POSTHOG_KEY.includes('placeholder')
  )
}

/** The client, once it has loaded. */
let client: PostHog | null = null

/** The load in flight, so two callers share one. */
let loading: Promise<void> | null = null

/**
 * The calls made before the client arrived.
 *
 * An event fired during the first render -- a sign-in, a page view -- would
 * otherwise be lost, because the tracker is a chunk fetch away. They are
 * replayed when it lands.
 */
const pending: Array<(client: PostHog) => void> = []

/** Everyone waiting for the client to arrive. */
const listeners = new Set<() => void>()

/**
 * Load PostHog.
 *
 * posthog-js is 84 KB gzipped, and it is analytics: nothing a visitor is
 * waiting for depends on it. Loading it at module scope put it in the root
 * layout's chunk graph, so every page -- the login page included -- shipped
 * it before it could render.
 *
 * The calls that arrive before it does are queued and replayed, so the
 * deferral costs nothing but a few milliseconds.
 */
export const loadAnalytics = async (): Promise<void> => {
  if (!isPostHogEnabled() || typeof window === 'undefined') return

  loading ??= import('posthog-js').then(({ default: posthog }) => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
    })
    client = posthog

    const queued = pending.splice(0, pending.length)
    for (const call of queued) {
      call(posthog)
    }
    for (const listener of listeners) {
      listener()
    }
  })

  await loading
}

/**
 * Run a call against the client, or keep it until the client arrives.
 */
const withClient = (call: (client: PostHog) => void): void => {
  if (client) {
    call(client)
    return
  }
  // The queue is bounded: a tracker that never loads must not become a
  // memory leak.
  if (pending.length < 100) {
    pending.push(call)
  }
}

/**
 * Subscribe to the client arriving.
 *
 * A component that reads a flag has to read it again once the tracker is
 * there, because until then the flag is the fallback.
 */
const onClientReady = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Emits a product event. No-op when PostHog is disabled. */
export function capture(event: string, properties?: Record<string, unknown>): void {
  if (!isPostHogEnabled() || typeof window === 'undefined') return
  withClient((c) => c.capture(event, properties))
}

/** Associates the current person with a known user ID. No-op when disabled. */
export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  if (!isPostHogEnabled() || typeof window === 'undefined') return
  withClient((c) => c.identify(userId, traits))
}

/** Forgets the current person (logout). No-op when disabled. */
export function resetAnalytics(): void {
  if (!isPostHogEnabled() || typeof window === 'undefined') return
  withClient((c) => c.reset())
}

/**
 * Synchronous flag read. `fallback` is returned when PostHog is disabled or
 * the flag is unknown — use `fallback = true` for kill-switch flags and
 * `fallback = false` for progressive-rollout flags.
 */
export function getFeatureFlag(key: string, fallback = false): boolean {
  if (!isPostHogEnabled() || typeof window === 'undefined') return fallback
  const raw = client?.getFeatureFlag(key)
  return raw == null ? fallback : Boolean(raw)
}

/**
 * Reactive flag hook that stays in sync with remote flag reloads.
 * Falls back to `fallback` while unknown.
 */
export function useFeatureFlag(key: string, fallback = false): boolean {
  const [value, setValue] = useState<boolean>(() => getFeatureFlag(key, fallback))

  useEffect(() => {
    if (!isPostHogEnabled()) return

    let unsubscribeFlags: (() => void) | undefined

    const read = () => {
      const raw = client?.getFeatureFlag(key)
      setValue(raw == null ? fallback : Boolean(raw))
    }

    const subscribe = () => {
      unsubscribeFlags?.()
      unsubscribeFlags = client?.onFeatureFlags(read)
      read()
    }

    // The tracker may not have loaded yet. When it does, the flag is read
    // again and the remote updates are subscribed to.
    subscribe()
    const unsubscribe = onClientReady(subscribe)

    return () => {
      unsubscribe()
      unsubscribeFlags?.()
    }
  }, [key, fallback])

  return value
}

/** Emits the standard auth_failed event for a login/verification failure. */
export function captureAuthFailure(method: string, reason: string): void {
  capture('auth_failed', { method, reason })
}

/** Emits the standard auth_succeeded event. */
export function captureAuthSuccess(method: string): void {
  capture('auth_succeeded', { method })
}
