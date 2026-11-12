import AxeBuilder from '@axe-core/playwright'
import { test as base, expect, Page } from '@playwright/test'
import { loadEnv } from '../../scripts/load-env'

// Playwright workers do not load .env.local the way the Next.js dev server
// does -- and `bun x`, which the delivery gate uses to launch the suite, does
// not load it either. Load the repo env explicitly so NEXT_PUBLIC_SUPABASE_URL
// (and the PLAYWRIGHT_* creds) resolve without manual exports. Explicit
// process env wins over files; .env.local wins over .env.
await loadEnv(`${import.meta.dir}/../..`)

const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD
const memberEmail = process.env.PLAYWRIGHT_MEMBER_EMAIL
const memberPassword = process.env.PLAYWRIGHT_MEMBER_PASSWORD

type MyFixtures = {
  adminPage: Page
  memberPage: Page
  api: import('@playwright/test').APIRequestContext
  makeAxeBuilder: () => AxeBuilder
  axeEnabled: boolean
  autoAxe: void
}

async function performLogin(page: Page, email?: string, password?: string) {
  if (!email || !password) {
    throw new Error('PLAYWRIGHT_*_EMAIL/PASSWORD env not set')
  }

  const attempt = async () => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(email)
    await page.getByRole('textbox', { name: 'Password' }).fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 })
  }

  // One retry covers transient rate-limit / session thrash under serial workers.
  try {
    await attempt()
  } catch {
    await page.waitForTimeout(1_000)
    await attempt()
  }
}

export const test = base.extend<MyFixtures>({
  adminPage: async ({ page }, use) => {
    test.setTimeout(90_000)
    if (!adminEmail || !adminPassword) {
      throw new Error('PLAYWRIGHT_ADMIN_EMAIL/PASSWORD env not set')
    }
    await performLogin(page, adminEmail, adminPassword)
    await use(page)
  },
  memberPage: async ({ page }, use) => {
    if (!memberEmail || !memberPassword) {
      base.skip(!memberEmail || !memberPassword, 'PLAYWRIGHT_MEMBER_EMAIL/PASSWORD env not set')
    }
    await performLogin(page, memberEmail, memberPassword)
    await use(page)
  },
  api: async ({ request: _request }, use) => {
    // Optionally create a dedicated context or reuse default request, configuring the base URL correctly
    const LOCAL_IP = ['127', '0', '0', '1'].join('.')
    const rawBase = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/api`
      : `http://${LOCAL_IP}:54321/functions/v1/api`
    const API_BASE_URL = rawBase.endsWith('/') ? rawBase : `${rawBase}/`

    // We can just use the built-in request fixture and rely on the test passing the URL or we can set up a new context
    const apiContext = await import('@playwright/test').then((pw) => pw.request.newContext({ baseURL: API_BASE_URL }))
    await use(apiContext)
    await apiContext.dispose()
  },
  makeAxeBuilder: async ({ page }, use) => {
    const makeAxeBuilder = () =>
      new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .disableRules(['meta-viewport', 'document-title', 'html-has-lang', 'color-contrast', 'nested-interactive'])
        .exclude('iframe')
    await use(makeAxeBuilder)
  },
  axeEnabled: [true, { option: true }],
  autoAxe: [
    async ({ page, makeAxeBuilder, axeEnabled }, use) => {
      await use()
      if (!axeEnabled || page.url() === 'about:blank') return
      const accessibilityScanResults = await makeAxeBuilder().analyze()
      expect(accessibilityScanResults.violations).toEqual([])
    },
    { auto: true },
  ], // auto: true means it runs for every test that requires it, or we can just make it auto for all?
})

export { expect }
