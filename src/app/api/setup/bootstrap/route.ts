import { NextResponse } from 'next/server'
import { autoBootstrapDatabase } from '@/features/auth/actions/setupActions'

export const dynamic = 'force-dynamic'

export async function POST() {
  const result = await autoBootstrapDatabase()
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 })
  }
  return NextResponse.json({ success: true, message: result.message })
}
