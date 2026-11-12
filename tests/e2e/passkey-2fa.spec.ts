import { test, expect } from './fixtures'

/**
 * End-to-end passkey (WebAuthn) 2FA flow against the deployed site.
 *
 * Prerequisites:
 *  - A test user created via GoTrue admin API (service role), exported to
 *    /tmp/passkey_e2e_user.env as USER_ID=<uuid> and EMAIL=<email>. The
 *    password is fixed at TestPass123! (kept in sync with the e2e setup).
 *  - NEXT_PUBLIC_SITE_URL points at the deployment under test.
 *
 * The test:
 *  1. Enrolls TOTP via the API (computing valid codes in-process).
 *  2. Enables a passkey through the real settings UI, satisfied by a CDP
 *     virtual authenticator (simulates Face ID / Touch ID / hardware key).
 *  3. Signs out, signs back in, and completes 2FA with a passkey assertion.
 */

const PASSWORD = 'TestPass123!'

const ENV_FILE = '/tmp/passkey_e2e_user.env'

async function loadTestUser(): Promise<{ email: string; secret?: string }> {
  const env: Record<string, string> = {}
  const file = Bun.file(ENV_FILE)
  if (await file.exists()) {
    for (const line of (await file.text()).split('\n')) {
      const [key, ...rest] = line.split('=')
      if (key) env[key] = rest.join('=')
    }
  }
  if (!env.EMAIL) {
    throw new Error('Missing test user. Run the passkey e2e setup script first (creates /tmp/passkey_e2e_user.env).')
  }
  return { email: env.EMAIL, secret: env.SECRET }
}

async function persistTestUserSecret(secret: string): Promise<void> {
  const file = Bun.file(ENV_FILE)
  const existing = (await file.exists()) ? await file.text() : ''
  await Bun.write(ENV_FILE, `${existing}SECRET=${secret}\n`)
}

function base32Decode(input: string): Uint8Array<ArrayBuffer> {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/\s/g, '')
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const ch of clean) {
    const idx = alphabet.indexOf(ch)
    if (idx === -1) throw new Error(`Invalid base32 character: ${ch}`)
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  const buffer = new ArrayBuffer(out.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < out.length; i++) {
    view[i] = out[i]
  }
  return view
}

async function totpCodes(secret: string): Promise<string[]> {
  const timeStep = 30
  const keyData = base32Decode(secret)
  const key = await crypto.subtle.importKey('raw', keyData.buffer, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  const counter = BigInt(Math.floor(Date.now() / 1000 / timeStep))
  const codes: string[] = []
  for (let offset = -1; offset <= 1; offset++) {
    const current = counter + BigInt(offset)
    const buffer = new Uint8Array(8)
    let c = current
    for (let i = 7; i >= 0; i--) {
      buffer[i] = Number(c & BigInt(0xff))
      c >>= BigInt(8)
    }
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, buffer))
    const start = sig[sig.length - 1] & 0x0f
    const code = ((sig[start] & 0x7f) << 24) | (sig[start + 1] << 16) | (sig[start + 2] << 8) | sig[start + 3]
    codes.push(String(code % 1000000).padStart(6, '0'))
  }
  return codes
}

interface LoginResponse {
  user?: { token: string }
  requires2FA?: boolean
  userId?: string
  tempToken?: string
}

async function apiLogin(
  request: import('@playwright/test').APIRequestContext,
  email: string,
  password: string
): Promise<LoginResponse> {
  const res = await request.post('/api/login', { data: { username: email, password } })
  const body = await res.json()
  expect(res.ok(), `api login failed: ${JSON.stringify(body)}`).toBeTruthy()
  return body
}

/**
 * Returns a live session token, completing the TOTP challenge if the account
 * already has 2FA enabled (idempotent across test runs).
 */
async function getSessionToken(
  request: import('@playwright/test').APIRequestContext,
  email: string,
  password: string
): Promise<string> {
  const login = await apiLogin(request, email, password)
  if (login.user?.token) return login.user.token

  expect(login.requires2FA, `unexpected login response: ${JSON.stringify(login)}`).toBeTruthy()
  const { secret } = await loadTestUser()
  expect(secret, '2FA is enabled but no TOTP secret is stored for this test user').toBeTruthy()

  const codes = await totpCodes(secret!)
  for (const code of codes) {
    const res = await request.post('/api/auth/2fa/verify-login', {
      data: { userId: login.userId, tempToken: login.tempToken, code, method: 'totp' },
    })
    const body = await res.json()
    if (res.ok() && body.user?.token) return body.user.token
  }
  throw new Error('Could not complete TOTP verify-login with stored secret.')
}

test('passkey enrollment + passkey sign-in round trip', async ({ page, request }) => {
  test.slow()
  const { email } = await loadTestUser()

  // --- 1. Idempotent API setup: session token, passkey cleanup, TOTP enroll ---
  const token = await getSessionToken(request, email, PASSWORD)
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const statusRes = await request.get('/api/auth/2fa/status', { headers: authHeaders })
  const status = await statusRes.json()
  expect(statusRes.ok(), `status failed: ${JSON.stringify(status)}`).toBeTruthy()

  // Remove any passkeys from previous runs so the UI shows the enroll button
  for (const passkey of status.passkeys || []) {
    const removeRes = await request.post('/api/auth/2fa/webauthn/passkeys/remove', {
      headers: authHeaders,
      data: { credentialId: passkey.credentialId },
    })
    expect(removeRes.ok(), `passkey removal failed: ${await removeRes.text()}`).toBeTruthy()
  }

  if (!status.totpEnrolled) {
    const enrollRes = await request.post('/api/auth/2fa/enroll', { headers: authHeaders })
    const enroll = await enrollRes.json()
    expect(enrollRes.ok(), `enroll failed: ${JSON.stringify(enroll)}`).toBeTruthy()
    expect(enroll.secret).toBeTruthy()

    const codes = await totpCodes(enroll.secret)
    let verifyOk = false
    for (const code of codes) {
      const verifyRes = await request.post('/api/auth/2fa/verify', {
        headers: authHeaders,
        data: { code },
      })
      const verify = await verifyRes.json()
      if (verify.success) {
        verifyOk = true
        break
      }
    }
    expect(verifyOk, 'TOTP verification with computed codes failed').toBeTruthy()
    await persistTestUserSecret(enroll.secret)
  }

  // --- 2. Enable a passkey through the real UI with a virtual authenticator ---
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

  // Log in through the UI to reach settings, completing the TOTP challenge
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('Two-Factor Authentication')).toBeVisible({ timeout: 30000 })

  const codes = await totpCodes((await loadTestUser()).secret!)
  let codeSubmitted = false
  for (const code of codes) {
    await page.getByRole('textbox', { name: /verification code/i }).fill(code)
    await page.getByRole('button', { name: 'Verify & Sign in' }).click()
    const submitted = await page
      .waitForURL((url) => url.pathname.startsWith('/library'), { timeout: 10000 })
      .then(() => true)
      .catch(() => false)
    if (submitted) {
      codeSubmitted = true
      break
    }
  }
  expect(codeSubmitted, 'UI TOTP challenge was not completed').toBeTruthy()

  await page.goto('/settings/authentication')
  await expect(page.getByText('Multi-Factor Authentication (2FA)')).toBeVisible()

  await page.getByRole('button', { name: 'Enable Facial 2FA' }).click()
  await expect(page.getByText('Facial 2FA / Biometric passkey has been successfully enabled')).toBeVisible({
    timeout: 30000,
  })
  await expect(page.getByRole('button', { name: 'Add Another Passkey' })).toBeVisible()

  // The status API must now report the passkey
  const passkeyStatusRes = await request.get('/api/auth/2fa/status', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const passkeyStatus = await passkeyStatusRes.json()
  expect(passkeyStatus.biometricEnrolled).toBeTruthy()
  expect(passkeyStatus.passkeys?.length).toBeGreaterThanOrEqual(1)

  // --- 3. Sign out and sign back in using the passkey ---
  await page.context().clearCookies()
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()

  // 2FA challenge: TOTP is the default tab; the biometric method is available
  // on demand and must never auto-trigger.
  await expect(page.getByText('Two-Factor Authentication')).toBeVisible({ timeout: 30000 })
  await expect(page.getByText('Biometric', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Authenticate with Facial 2FA/ })).toHaveCount(0)

  await page.getByRole('button', { name: /Biometric/ }).click()
  await page.getByRole('button', { name: /Authenticate with Facial 2FA/ }).click()
  await page.waitForURL((url) => url.pathname.startsWith('/library'), { timeout: 30000 })
})
// NOTE: passkey specs are Chromium-only via the `chromium-stateful` project's
// testMatch (CDP virtual authenticator); no per-test skip needed here.
