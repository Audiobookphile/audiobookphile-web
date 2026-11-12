'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/shared/lib/api/browser'
import { type AdminAnalyticsData, AdminAnalyticsGrid } from './AdminAnalyticsGrid'
import { AdminAnalyticsSkeleton } from './AdminAnalyticsSkeleton'

const EMPTY: AdminAnalyticsData = {
  totalUsers: null,
  totalLibraries: null,
  totalItems: null,
  activeSessions: null,
}

function sanitize(resData: AdminAnalyticsData): AdminAnalyticsData {
  return {
    totalUsers: typeof resData?.totalUsers === 'number' ? resData.totalUsers : null,
    totalLibraries: typeof resData?.totalLibraries === 'number' ? resData.totalLibraries : null,
    totalItems: typeof resData?.totalItems === 'number' ? resData.totalItems : null,
    activeSessions: typeof resData?.activeSessions === 'number' ? resData.activeSessions : null,
  }
}

export default function AdminAnalyticsWidget() {
  const [data, setData] = useState<AdminAnalyticsData>(EMPTY)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    // Non-throwing fetch (P2.2): read .ok explicitly, never let an endpoint
    // failure throw or console.error — render "—" instead.
    apiFetch<AdminAnalyticsData>('/api/admin-analytics', { method: 'GET' })
      .then(
        (result) => {
          if (cancelled) return
          setData(result.ok ? sanitize(result.data) : EMPTY)
        },
        () => {
          if (!cancelled) setData(EMPTY)
        }
      )
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!ready) {
    return <AdminAnalyticsSkeleton />
  }

  return <AdminAnalyticsGrid data={data} />
}
