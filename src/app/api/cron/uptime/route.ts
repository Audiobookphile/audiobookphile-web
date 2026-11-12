import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

const CHECKS = [
  { name: 'apex', url: 'https://audiobookphile.app/', expect: [200, 301, 302, 307, 308] },
  { name: 'www', url: 'https://www.audiobookphile.app/', expect: [200, 301, 302, 307, 308] },
  { name: 'app', url: 'https://app.audiobookphile.app/', expect: [200, 301, 302, 307, 308] },
]

async function checkSite(url: string, expect: number[], timeoutMs = 10000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  const started = Date.now()
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'manual', signal: ctrl.signal })
    return { ok: expect.includes(res.status), status: res.status, ms: Date.now() - started }
  } catch (err) {
    return { ok: false, status: 0, ms: Date.now() - started, error: err instanceof Error ? err.message : String(err) }
  } finally {
    clearTimeout(t)
  }
}

async function checkEdgeHealth(timeoutMs = 10000) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!supabaseUrl) return { ok: false, status: 0, ms: 0, error: 'Supabase URL not configured' }
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  const started = Date.now()
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/api/health`, {
      headers: anonKey ? { apikey: anonKey } : {},
      signal: ctrl.signal,
    })
    const ok = res.status === 200
    return { ok, status: res.status, ms: Date.now() - started }
  } catch (err) {
    return { ok: false, status: 0, ms: Date.now() - started, error: err instanceof Error ? err.message : String(err) }
  } finally {
    clearTimeout(t)
  }
}

export async function GET(req: NextRequest) {
  // Vercel Cron signs with CRON_SECRET when configured; require it then,
  // otherwise the route is still reachable for manual/degraded checks.
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization') || ''
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const results: Record<string, unknown> = {}
  let failed = 0
  for (const c of CHECKS) {
    const r = await checkSite(c.url, c.expect)
    results[c.name] = r
    if (!r.ok) failed++
  }
  const edge = await checkEdgeHealth()
  results['edge'] = edge
  if (!edge.ok) failed++

  if (failed > 0) {
    const err = new Error(
      `Uptime check failed: ${failed} failing (${Object.entries(results)
        .filter(([, v]) => !(v as { ok: boolean }).ok)
        .map(([k]) => k)
        .join(', ')})`
    )
    try {
      Sentry.captureException(err, { extra: { results } })
    } catch {
      // Sentry must never break the health signal itself
    }
    return NextResponse.json({ ok: false, failed, results }, { status: 500 })
  }
  return NextResponse.json({ ok: true, results })
}
