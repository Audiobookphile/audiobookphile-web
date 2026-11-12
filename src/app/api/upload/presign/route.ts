import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/shared/utils/supabase/env'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = getSupabaseUrl()
    const anonKey = getSupabaseAnonKey()
    if (!supabaseUrl) {
      return NextResponse.json({ error: 'Supabase URL not configured' }, { status: 500 })
    }

    const body = await req.json()
    const authHeader = req.headers.get('authorization') || ''
    const cookieHeader = req.headers.get('cookie') || ''

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (authHeader) headers['Authorization'] = authHeader
    if (cookieHeader) headers['Cookie'] = cookieHeader
    if (anonKey) headers['apikey'] = anonKey

    const edgeUrl = `${supabaseUrl}/functions/v1/api/upload-presign`
    const res = await fetch(edgeUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    const text = await res.text()
    let data: Record<string, unknown>
    try {
      data = JSON.parse(text)
    } catch {
      data = {
        error: `Edge Function returned status ${res.status}`,
        detail: text.slice(0, 500),
      }
    }
    return NextResponse.json(data, { status: res.status })
  } catch (error: unknown) {
    const err = error as Error
    console.error('Error in /api/upload/presign proxy:', err.message)
    return NextResponse.json({ error: err.message || 'Internal proxy error' }, { status: 500 })
  }
}
