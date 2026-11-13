import { NextResponse } from 'next/server'
import { autoBootstrapDatabase, hasExistingAdmin } from '@/features/auth/actions/setupActions'

export const dynamic = 'force-dynamic'

/**
 * One-shot schema bootstrap.
 *
 * This endpoint is deliberately unauthenticated — on a brand-new deployment
 * there is no account to authenticate with yet — so it is guarded by state
 * instead: once an administrator exists the database is initialized and the
 * endpoint refuses to run again.
 */
export async function POST() {
  const adminExists = await hasExistingAdmin()
  if (adminExists === true) {
    return NextResponse.json(
      { error: 'This instance is already initialized. Use the setup wizard only on a fresh deployment.' },
      { status: 409 }
    )
  }

  const result = await autoBootstrapDatabase()
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 })
  }
  return NextResponse.json({ success: true, message: result.message })
}
