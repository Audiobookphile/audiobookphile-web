import { test, expect } from './fixtures'
import { APIRequestContext } from '@playwright/test'
import { loadEnv } from '../../scripts/load-env'

/**
 * 2FA method suggestion UX: the two-factor challenge screen must
 *  1. default to TOTP when it is enrolled (never auto-select PIN/biometric),
 *  2. show un-enrolled methods (PIN, biometric) as *suggestions* with a
 *     "Set up" hint instead of hiding them, and
 *  3. never offer the verify action for a method that is not enrolled.
 *
 * Users are provisioned at runtime via the GoTrue admin API + direct profile
 * updates (service role key from .env.local).
 */

const PASSWORD = 'TestPass123!'

// Load .env.local so the admin credentials resolve without a manual export.
// A variable already in the environment is never overridden by a file, so an
// explicit export still wins.
await loadEnv(`${import.meta.dir}/../..`)

// Web Crypto instead of node:crypto — a standard global on every runtime
// Bun supports, and it removes the last Node-only import from this spec.
function randomHex(byteLength: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(byteLength)))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function randomBase64(byteLength: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength))
  return btoa(String.fromCharCode(...bytes))
}

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

async function createTestUser(request: APIRequestContext, email: string): Promise<{ id: string; email: string }> {
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
    `GoTrue user creation failed: status=${res.status()} body=${JSON.stringify(body).slice(0, 200)}`
  ).toBeTruthy()
  expect(body.id, 'GoTrue did not return a user id').toBeTruthy()
  return { id: body.id, email: body.email }
}

/** Directly seed 2FA profile state (service role bypasses RLS). */
async function seedProfile(request: APIRequestContext, userId: string, patch: Record<string, unknown>): Promise<void> {
  const { url, serviceKey } = supabaseAdminEnv()
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates',
  }
  const res = await request.post(`${url}/rest/v1/profiles?on_conflict=id`, {
    headers,
    data: { id: userId, ...patch },
  })
  expect(
    res.ok(),
    `profile seeding failed: status=${res.status()} body=${(await res.text()).slice(0, 200)}`
  ).toBeTruthy()
}

async function deleteTestUser(request: APIRequestContext, userId: string): Promise<void> {
  const { url, serviceKey } = supabaseAdminEnv()
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  }
  await request.delete(`${url}/rest/v1/webauthn_credentials?user_id=eq.${userId}`, { headers })
  await request.delete(`${url}/rest/v1/webauthn_challenges?user_id=eq.${userId}`, { headers })
  // A 500 here is a known cosmetic GoTrue quirk; credentials are already purged.
  await request.delete(`${url}/auth/v1/admin/users/${userId}`, { headers })
}

/** Signs in and waits for the 2FA challenge card to appear. */
async function reach2FAScreen(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('Two-Factor Authentication')).toBeVisible({ timeout: 30000 })
}

test('TOTP-only user: defaults to TOTP and suggests PIN + biometric (not set up)', async ({ page, request }) => {
  const email = `e2e-2fa-totp-${Date.now()}@audiobookphile.test`
  const { id: userId } = await createTestUser(request, email)

  try {
    await seedProfile(request, userId, {
      is_2fa_enabled: true,
      totp_secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', // fixed base32 secret (never completed)
    })

    await reach2FAScreen(page, email)

    // Default method is TOTP — the 6-digit input and the verify action render.
    await expect(page.getByLabel('6-Digit Verification Code')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Verify & Sign in' })).toBeVisible()

    // Both un-enrolled methods are visible as suggestions.
    const pinTab = page.getByRole('button', { name: /PIN Code/ })
    const bioTab = page.getByRole('button', { name: /Biometric/ })
    await expect(pinTab).toBeVisible()
    await expect(bioTab).toBeVisible()
    await expect(pinTab.getByText('Set up')).toBeVisible()
    await expect(bioTab.getByText('Set up')).toBeVisible()

    // Selecting a suggested PIN tab explains how to enable it and offers no verify action.
    await pinTab.click()
    await expect(page.getByText('A PIN code is not set up yet.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Verify & Sign in' })).toHaveCount(0)

    // Same for the biometric suggestion.
    await bioTab.click()
    await expect(page.getByText('Biometric 2FA is not set up yet.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Verify & Sign in' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Enable Biometric in Settings' })).toBeVisible()

    // Back to TOTP restores the verifier UI.
    await page.getByRole('button', { name: /TOTP/ }).click()
    await expect(page.getByLabel('6-Digit Verification Code')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Verify & Sign in' })).toBeVisible()
  } finally {
    await deleteTestUser(request, userId)
  }
})

test('TOTP + biometric user: defaults to TOTP and never auto-triggers the passkey', async ({ page, request }) => {
  const email = `e2e-2fa-bio-${Date.now()}@audiobookphile.test`
  const { id: userId } = await createTestUser(request, email)

  try {
    await seedProfile(request, userId, {
      is_2fa_enabled: true,
      totp_secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
      biometric_enrolled: true,
    })

    // A passkey row is required for the backend to report biometric as enrolled.
    const { url, serviceKey } = supabaseAdminEnv()
    const headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    }
    const cred = await request.post(`${url}/rest/v1/webauthn_credentials`, {
      headers,
      data: {
        user_id: userId,
        credential_id: `cred-${randomHex(16)}`,
        public_key: randomBase64(64),
      },
    })
    expect(cred.ok(), `passkey seeding failed: ${cred.status()} ${(await cred.text()).slice(0, 200)}`).toBeTruthy()

    await reach2FAScreen(page, email)

    // Regression: TOTP is the default tab, not biometric — no auto passkey prompt.
    await expect(page.getByLabel('6-Digit Verification Code')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Authenticate with Facial 2FA / Passkey' })).toHaveCount(0)

    // Biometric tab is present and switches to the (enrolled) passkey UI on demand.
    const bioTab = page.getByRole('button', { name: /Biometric/ })
    await expect(bioTab).toBeVisible()
    await bioTab.click()
    await expect(page.getByRole('button', { name: 'Authenticate with Facial 2FA / Passkey' })).toBeVisible()
  } finally {
    await deleteTestUser(request, userId)
  }
})
