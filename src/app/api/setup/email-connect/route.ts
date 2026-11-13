import { NextResponse } from 'next/server'
import { sendMobileConnectEmailAction } from '@/features/auth/actions/setupActions'

export const dynamic = 'force-dynamic'

/**
 * On-demand dispatch of mobile client connection details and deep link.
 *
 * Supports self-hosted deployment automation, testing suites, and external webhooks
 * to deliver canonical instance configuration directly to user inboxes.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const includeDemoCredentials = Boolean(body.includeDemoCredentials)
    const serverUrl = typeof body.serverUrl === 'string' ? body.serverUrl.trim() : undefined

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { ok: false, error: 'A valid email address is required.' },
        { status: 400 }
      )
    }

    const result = await sendMobileConnectEmailAction(email, includeDemoCredentials, serverUrl)
    return NextResponse.json(result, { status: result.ok ? 200 : 400 })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { ok: false, error: `Failed to process request: ${errorMsg}` },
      { status: 500 }
    )
  }
}

