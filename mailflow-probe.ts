import { chromium } from '@playwright/test'

/**
 * Probe the password-recovery and magic-link email flows end to end.
 *
 * Run with: bun run mailflow-probe.ts
 *
 * Bun loads `.env.local` automatically, so the environment comes from the
 * same file the app uses -- no dotenv, no hand-rolled parser, and no
 * machine-specific absolute path.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY

if (!url || !serviceKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (.env.local)')
  process.exit(1)
}

const site = 'https://audiobookphile.app'
const login = `abp${Date.now().toString()}`
const domain = '1secmail.com'
const email = `${login}@${domain}`
const password = 'ResetTest123!'
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Base64 -> UTF-8 string. `Uint8Array.fromBase64` is a Bun built-in, so this
 * needs neither `atob` (which yields latin1 bytes) nor Node's `Buffer`.
 */
function decodeBase64Utf8(base64: string): string {
  return new TextDecoder().decode(Uint8Array.fromBase64(base64))
}

const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }

async function api(path: string, opts: RequestInit = {}): Promise<{ status: number; body: unknown }> {
  const res = await fetch(path, opts)
  const text = await res.text()
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return { status: res.status, body }
}

async function main(): Promise<void> {
  const created = await api(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { username: 'mailprobe' } }),
  })
  const userId = (created.body as { id?: string })?.id
  if (!userId) {
    console.log('CREATE FAILED:', created.status, JSON.stringify(created.body))
    process.exit(1)
  }
  console.log('user:', email, userId)

  // The tuple type matters: without it, TypeScript widens the array to a
  // union of the element types and `endpoint` is inferred as
  // `string | { email: string } | ...`, which is not a string at all.
  const cases: [string, string, Record<string, string>][] = [
    ['forgot-password', '/api/auth/forgot-password', { email }],
    ['magic-link', '/api/auth/magic-link', { email, redirectTo: `${site}/auth/callback?next=/library` }],
  ]
  for (const [name, endpoint, body] of cases) {
    const res = await api(`${site}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    console.log(name, '=>', res.status, JSON.stringify(res.body))
  }

  const messages: { id: string; subject?: string; links: string[] }[] = []
  for (let i = 0; i < 14; i++) {
    await sleep(12000)
    try {
      const inbox = await api(`https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`)
      const msgs = Array.isArray(inbox.body) ? inbox.body : []
      for (const msg of msgs) {
        if (messages.some((m) => m.id === msg.id)) continue
        const full = await api(
          `https://www.1secmail.com/api/v1/?action=readMessage&login=${login}&domain=${domain}&id=${msg.id}`
        )
        const fullBody = full.body as { htmlBody?: string; subject?: string } | null
        const html = fullBody?.htmlBody ? decodeBase64Utf8(fullBody.htmlBody) : ''
        const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1])
        messages.push({ id: msg.id, subject: fullBody?.subject, links })
        console.log('EMAIL:', msg.id, fullBody?.subject)
        console.log('LINKS:', JSON.stringify(links))
      }
      if (messages.length >= 2) break
    } catch {
      /* transient */
    }
  }

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()

  for (const msg of messages) {
    const href = msg.links[0]
    if (!href) continue
    console.log('\nREPLAY:', href.slice(0, 170))
    const page = await context.newPage()
    const resp = await page
      .goto(href, { waitUntil: 'domcontentloaded', timeout: 45000 })
      .catch((e: unknown) => String(e).slice(0, 100))
    if (typeof resp !== 'string') {
      console.log('FINAL URL:', page.url())
      const cookies = (await context.cookies()).filter((c) => c.name.includes('sb-')).map((c) => c.name)
      console.log('sb cookies:', cookies.length > 0 ? 'PRESENT' : 'NONE')
      if (page.url().includes('/reset-password')) console.log('>>> RECOVERY OK: reset-password page reached')
      if (page.url().includes('/library')) console.log('>>> MAGIC LINK OK: /library reached')
      if (page.url().includes('auth-code-error')) console.log('>>> ERROR PAGE (auth-code-error)')
    } else {
      console.log('goto error:', resp)
    }
    await page.close()
  }

  await browser.close()
  await api(`${url}/auth/v1/admin/users/${userId}`, { method: 'DELETE', headers }).catch(() => {})
  console.log('CLEANUP DONE')
}

main().catch((error: unknown) => {
  console.error('mailflow probe failed:', error)
  process.exit(1)
})
