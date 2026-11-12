import { NextResponse } from 'next/server'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/shared/utils/supabase/env'
import { createClient } from '@/shared/utils/supabase/server'
import { createServiceRoleClient } from '@/shared/utils/supabase/service-role'

export const dynamic = 'force-dynamic'

interface SystemStatusRpcResponse {
  initialized: boolean
  has_admin: boolean
  admin_count: number
  library_count: number
  storage_ready: boolean
}

export async function GET(request: Request) {
  const supabaseUrl = getSupabaseUrl()
  const anonKey = getSupabaseAnonKey()

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({
      configured: false,
      reason: 'Missing Supabase URL or API Anon Key',
      supabaseUrl: supabaseUrl || null,
      database: { connected: false, initialized: false, hasAdmin: false, adminCount: 0 },
      storage: { ready: false },
      edgeApi: { deployed: false, status: 0 },
    })
  }

  const isSupabaseCloud = supabaseUrl.includes('.supabase.co')
  const projectRef = isSupabaseCloud ? supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || null : null

  let databaseConnected = false
  let databaseInitialized = false
  let hasAdmin = false
  let adminCount = 0
  let libraryCount = 0
  let storageReady = false
  let edgeApiDeployed = false
  let edgeApiStatus = 0

  // 1. Check Database status
  try {
    let supabase: any
    try {
      supabase = createServiceRoleClient()
    } catch {
      supabase = await createClient()
    }

    let rpcWorked = false
    try {
      const { data, error } = await supabase.rpc('get_system_status')
      if (!error && data) {
        const statusData = data as unknown as SystemStatusRpcResponse
        databaseConnected = true
        databaseInitialized = statusData.initialized ?? true
        hasAdmin = statusData.has_admin ?? false
        adminCount = statusData.admin_count ?? 0
        libraryCount = statusData.library_count ?? 0
        storageReady = statusData.storage_ready ?? false
        rpcWorked = true
      }
    } catch {
      rpcWorked = false
    }

    if (!rpcWorked) {
      const { count: profileCount, error: profileError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .in('user_type', ['admin', 'root'])

      if (profileError) {
        if (
          profileError.message.includes('relation') ||
          profileError.message.includes('does not exist') ||
          profileError.code === '42P01' ||
          profileError.code === 'PGRST200' ||
          profileError.code === 'PGRST205'
        ) {
          databaseConnected = true
          databaseInitialized = false
        } else {
          databaseConnected = false
        }
      } else {
        databaseConnected = true
        databaseInitialized = true
        adminCount = profileCount ?? 0
        hasAdmin = adminCount > 0

        const { count: libCount } = await supabase
          .from('libraries')
          .select('id', { count: 'exact', head: true })
        libraryCount = libCount ?? 0
      }
    }
  } catch (err) {
    console.warn('[Setup Status] Database probe error:', err)
  }

  // 2. Check Edge Function health
  try {
    const healthUrl = `${supabaseUrl}/functions/v1/api/health`
    const res = await fetch(healthUrl, {
      method: 'GET',
      headers: anonKey ? { apikey: anonKey } : {},
      signal: AbortSignal.timeout(4000),
    })
    edgeApiStatus = res.status
    edgeApiDeployed = res.status === 200
  } catch {
    edgeApiDeployed = false
    edgeApiStatus = 0
  }

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') || (host && !host.includes('localhost') ? 'https' : 'http')
  const requestUrl = host ? `${proto}://${host}` : null

  const serverUrl =
    (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')
      ? process.env.NEXT_PUBLIC_SITE_URL
      : null) ||
    requestUrl ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'https://audiobookphile.app'

  const canAutoBootstrap = Boolean(
    process.env.POSTGRES_URL ||
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.DATABASE_URL ||
      process.env.SUPABASE_ACCESS_TOKEN
  )

  const demoUsername = 'demo@audiobookphile.app'
  const demoPassword = 'AudiobookphileDemo2026!'
  const mobileDeepLink = `audiobookphile://connect?server=${encodeURIComponent(serverUrl)}&username=${encodeURIComponent(demoUsername)}&password=${encodeURIComponent(demoPassword)}&autoLogin=1`

  return NextResponse.json({
    configured: true,
    serverUrl,
    canAutoBootstrap,
    supabaseUrl,
    anonKey: anonKey || null,
    projectRef,
    sqlEditorUrl: projectRef ? `https://supabase.com/dashboard/project/${projectRef}/sql/new` : null,
    credentials: {
      serverUrl,
      supabaseUrl,
      hasDemoAccount: true,
      demoAccount: {
        username: demoUsername,
        password: demoPassword,
      },
      deepLink: mobileDeepLink,
    },
    database: {
      connected: databaseConnected,
      initialized: databaseInitialized,
      hasAdmin,
      adminCount,
      libraryCount,
    },
    storage: {
      ready: storageReady,
    },
    edgeApi: {
      deployed: edgeApiDeployed,
      status: edgeApiStatus,
    },
  })
}
