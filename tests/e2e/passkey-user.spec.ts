import { test, expect } from './fixtures'
import { loadEnv } from '../../scripts/load-env'
import { type APIRequestContext } from '@playwright/test'

/**
 * End-to-end check that a REGULAR (non-admin) user can enroll a passkey from
 * the web security dashboard (/settings/authentication), while admin-only
 * settings pages remain off-limits.
 *
 * The account is created at runtime via the GoTrue admin API using the service
 * role key from .env.local (SUPABASE_SERVICE_KEY) — same mechanism used by the
 * manual setup for passkey-2fa.spec.ts.
 */

const PASSWORD = 'TestPass123!'

// Load .env.local so the admin credentials resolve without a manual export.
// A variable already in the environment is never overridden by a file, so an
// explicit export still wins.
await loadEnv(`${import.meta.dir}/../..`)

function supabaseAdminEnv(): { url: string; serviceKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY (.env.local). Cannot create the E2E test user.'
    )
  }
  return { url, serviceKey }
}

interface GoTrueUser {
  id: string
  email: string
}

async function createTestUser(request: APIRequestContext, email: string): Promise<GoTrueUser> {
  const { url, serviceKey } = supabaseAdminEnv()
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  }
  const res = await request.post(`${url}/auth/v1/admin/users`, {
    headers,
    data: { email, password: PASSWORD, email_confirm: true },
  })
  const body = await res.json().catch(() => ({}))
  expect(
    res.ok(),
    `GoTrue user creation failed: url=${res.url()} status=${res.status()} body=${JSON.stringify(body).slice(0, 200)}`
  ).toBeTruthy()
  expect(body.id, 'GoTrue did not return a user id').toBeTruthy()
  return { id: body.id, email: body.email }
}

async function deleteTestUser(request: APIRequestContext, userId: string): Promise<void> {
  const { url, serviceKey } = supabaseAdminEnv()
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  }
  // Also purge any passkeys/challenges via the REST API (service role bypasses RLS)
  await request.delete(`${url}/rest/v1/webauthn_credentials?user_id=eq.${userId}`, { headers })
  await request.delete(`${url}/rest/v1/webauthn_challenges?user_id=eq.${userId}`, { headers })
  // GoTrue admin user deletion (a 500 here is a known cosmetic GoTrue quirk;
  // the passkeys/credentials are already purged above).
  await request.delete(`${url}/auth/v1/admin/users/${userId}`, { headers })
}

test('regular user can enroll a passkey from the security dashboard but cannot open admin settings', async ({
  page,
  request,
}) => {
  test.slow()

  const email = `e2e-user-${Date.now()}@audiobookphile.test`
  const { id: userId } = await createTestUser(request, email)

  try {
    // --- 1. Sign in through the UI; a fresh user lands on /library ---
    await page.goto('/login')
    await page.getByLabel('Email').fill(email)
    await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL((url) => url.pathname.startsWith('/library'), { timeout: 30000 })

    // --- 2. The security dashboard must be reachable for regular users ---
    await page.goto('/settings/authentication')
    await expect(page.getByText('Multi-Factor Authentication (2FA)')).toBeVisible({ timeout: 30000 })

    // Nav must expose the security entry and hide admin-only entries
    await expect(page.getByRole('link', { name: 'Authentication & 2FA' })).toBeVisible()
    await expect(page.getByText('Admin Dashboard', { exact: true })).toHaveCount(0)

    // --- 3. Admin-only settings stay blocked: redirected back to /library ---
    await page.goto('/settings/users')
    await page.waitForURL((url) => url.pathname.startsWith('/library'), { timeout: 15000 })

    // --- 4. Enroll a passkey via the real UI with a virtual authenticator ---
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('WebAuthn.enable')
    await cdp.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    })

    await page.goto('/settings/authentication')

    // Collect every /api/auth/2fa/status response; the panel refetches after
    // enrollment, so the last 200 response reflects the enrolled passkey.
    const statusResponses: import('@playwright/test').Response[] = []
    page.on('response', (res) => {
      if (res.url().includes('/api/auth/2fa/status') && res.status() === 200) statusResponses.push(res)
    })

    await page.getByRole('button', { name: 'Enable Facial 2FA' }).click()
    await expect(page.getByText('Facial 2FA / Biometric passkey has been successfully enabled')).toBeVisible({
      timeout: 30000,
    })
    await expect(page.getByRole('button', { name: 'Add Another Passkey' })).toBeVisible()

    // --- 5. The status API must report the enrolled passkey ---
    const status = await statusResponses[statusResponses.length - 1].json()
    expect(status.biometricEnrolled).toBeTruthy()
    expect(status.passkeys?.length).toBeGreaterThanOrEqual(1)
  } finally {
    await deleteTestUser(request, userId)
  }
})
