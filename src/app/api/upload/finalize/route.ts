import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
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

    const edgeUrl = `${supabaseUrl}/functions/v1/api/upload/finalize`
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
    console.error('Error in /api/upload/finalize proxy:', err.message)
    return NextResponse.json({ error: err.message || 'Internal proxy error' }, { status: 500 })
  }
}
