'use server'

// Server-only: this module reads supabase/schema.sql from disk when the
// a-priori schema is missing. next.config.ts adds that file to the server
// trace so it exists on Vercel as well as in the Bun container.
// eslint-disable-next-line import/no-nodejs-modules -- server-only schema read
import fs from 'node:fs'
// eslint-disable-next-line import/no-nodejs-modules -- server-only schema path
import path from 'node:path'
import { headers } from 'next/headers'
import postgres from 'postgres'
import { createClient } from '@/shared/utils/supabase/server'
import { createServiceRoleClient } from '@/shared/utils/supabase/service-role'
import { sendDeploymentWelcomeEmail, buildMobileConnectDeepLink } from '@/shared/lib/email/deploymentEmail'

export interface SetupResult {
  ok: boolean
  error?: string
  redirectTo?: string
  emailSent?: boolean
  emailRecipient?: string
  emailTransport?: string
  serverUrl?: string
  deepLink?: string
}

export interface BootstrapResult {
  ok: boolean
  message: string
}

/**
 * Checks whether any administrator already exists.
 *
 * Returns `true` when at least one admin/root profile exists, `false` when the
 * profiles table is readable and empty, and `null` when the answer cannot be
 * determined (missing service-role key, or the schema has not been created
 * yet). Callers treat `null` as "probably uninitialized" so a fresh project
 * can still bootstrap.
 */
export async function hasExistingAdmin(): Promise<boolean | null> {
  let client: ReturnType<typeof createServiceRoleClient>
  try {
    client = createServiceRoleClient()
  } catch {
    return null
  }

  const { count, error } = await client
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .in('user_type', ['admin', 'root'])

  if (error) return null
  return (count ?? 0) > 0
}

/**
 * Automatically initializes the PostgreSQL schema, tables, and RLS policies
 * using the connection string injected by Vercel's Supabase Integration.
 *
 * The bootstrap is one-shot: once an administrator exists the schema is
 * already initialized, so a second call is refused rather than replaying DDL
 * on a live database.
 */
export async function autoBootstrapDatabase(): Promise<BootstrapResult> {
  const adminExists = await hasExistingAdmin()
  if (adminExists === true) {
    return {
      ok: true,
      message: 'Database is already initialized (an administrator exists); bootstrap was skipped.',
    }
  }

  // Prefer the direct (non-pooling) connection for DDL. The transaction pooler
  // in front of POSTGRES_URL is fine for app queries but is the wrong place to
  // run extensions and multi-statement schema DDL.
  const connectionString =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL

  // 1. Direct Postgres execution (instant execution via node-postgres driver)
  if (connectionString) {
    let sql: ReturnType<typeof postgres> | null = null
    try {
      sql = postgres(connectionString, {
        ssl: 'require',
        max: 1,
        connect_timeout: 15,
      })

      const schemaPath = path.join(process.cwd(), 'supabase', 'schema.sql')
      let schemaSql = ''
      if (fs.existsSync(schemaPath)) {
        schemaSql = fs.readFileSync(schemaPath, 'utf8')
      }

      if (!schemaSql) {
        return { ok: false, message: 'Could not locate supabase/schema.sql in repository root.' }
      }

      // Execute entire schema definition in Postgres
      await sql.unsafe(schemaSql)
      return { ok: true, message: 'Database schema, tables, and RLS policies successfully initialized!' }
    } catch (err) {
      console.error('[autoBootstrapDatabase] Direct SQL error:', err)
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Database bootstrap encountered an error.',
      }
    } finally {
      if (sql) {
        await sql.end()
      }
    }
  }

  // 2. Supabase Management API fallback if access token and project ref are present
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN
  const projectId =
    process.env.SUPABASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]

  if (accessToken && projectId) {
    try {
      const schemaPath = path.join(process.cwd(), 'supabase', 'schema.sql')
      const schemaSql = fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath, 'utf8') : ''
      if (schemaSql) {
        const res = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: schemaSql }),
        })
        if (res.ok) {
          return { ok: true, message: 'Database schema deployed via Supabase Management API!' }
        }
      }
    } catch (err) {
      console.error('[autoBootstrapDatabase] Management API error:', err)
    }
  }

  return {
    ok: false,
    message:
      'No database connection string is available for automated bootstrapping. Link the Supabase integration to this Vercel project and redeploy so POSTGRES_URL_NON_POOLING (or POSTGRES_URL) is injected.',
  }
}

/**
 * Creates the initial Root Administrator account during template onboarding.
 * Strictly guarded: can ONLY be called once when no admin/root accounts exist.
 * Automatically runs autoBootstrapDatabase() if the schema has not been initialized yet.
 */
export async function createInitialAdmin(prevState: SetupResult | null, formData: FormData): Promise<SetupResult> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const username = (formData.get('username') as string)?.trim() || email?.split('@')[0]
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!email || !email.includes('@')) {
    return { ok: false, error: 'A valid email address is required.' }
  }
  if (!password || password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters.' }
  }
  if (password !== confirmPassword) {
    return { ok: false, error: 'Passwords do not match.' }
  }

  // 1. Verify / bootstrap database schema if necessary
  try {
    let serviceClient: ReturnType<typeof createServiceRoleClient> | null = null
    try {
      serviceClient = createServiceRoleClient()
    } catch {
      // Service role key not configured, fall back to server client
    }

    const checkClient = serviceClient || (await createClient())
    const { count, error: countError } = await checkClient
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .in('user_type', ['admin', 'root'])

    // If table doesn't exist, try auto-bootstrap automatically
    if (countError && (countError.message.includes('relation') || countError.code === '42P01')) {
      const bootstrap = await autoBootstrapDatabase()
      if (!bootstrap.ok) {
        return {
          ok: false,
          error: `Database tables missing. Auto-bootstrap attempt: ${bootstrap.message}`,
        }
      }
    } else if (!countError && typeof count === 'number' && count > 0) {
      return { ok: false, error: 'Initial administrator setup has already been completed. Please sign in.' }
    }

    // 2. Create the user
    if (serviceClient) {
      // Create user via Admin API (auto-confirmed, no SMTP email barrier on first run)
      const { data: userData, error: createError } = await serviceClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username },
      })

      if (createError || !userData?.user) {
        return { ok: false, error: createError?.message || 'Failed to create owner user.' }
      }

      // Ensure profile is assigned root role
      await serviceClient.from('profiles').upsert({
        id: userData.user.id,
        username,
        user_type: 'root',
      })
    } else {
      // Fallback to standard sign up
      const supabase = await createClient()
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
        },
      })

      if (signUpError || !signUpData?.user) {
        return { ok: false, error: signUpError?.message || 'Failed to register administrator.' }
      }
    }

    // 3. Resolve canonical server URL for mobile deep-linking
    let requestOrigin: string | null = null
    try {
      const headerList = await headers()
      const host = headerList.get('x-forwarded-host') || headerList.get('host')
      const proto = headerList.get('x-forwarded-proto') || (host && !host.includes('localhost') ? 'https' : 'http')
      if (host) {
        requestOrigin = `${proto}://${host}`
      }
    } catch {}

    const serverUrl =
      (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')
        ? process.env.NEXT_PUBLIC_SITE_URL
        : null) ||
      requestOrigin ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      'https://audiobookphile.app'

    // 4. Dispatch deployment credentials & iOS auto-mapping email
    let emailResult = null
    try {
      emailResult = await sendDeploymentWelcomeEmail({
        to: email,
        username,
        serverUrl,
        password,
        includeAutoLogin: true,
      })
    } catch (emailErr) {
      console.warn('[createInitialAdmin] Failed to dispatch welcome email:', emailErr)
    }

    // 5. Authenticate the newly created root user
    const client = await createClient()
    const { error: signInError } = await client.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      // Account created, but sign-in requires manual credentials entry
      return {
        ok: true,
        redirectTo: '/login',
        emailSent: emailResult?.success ?? false,
        emailRecipient: email,
        emailTransport: emailResult?.transport ?? 'console-dev',
        serverUrl,
        deepLink: emailResult?.deepLink,
      }
    }

    return {
      ok: true,
      redirectTo: '/library',
      emailSent: emailResult?.success ?? false,
      emailRecipient: email,
      emailTransport: emailResult?.transport ?? 'console-dev',
      serverUrl,
      deepLink: emailResult?.deepLink,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}

/**
 * Server action to dispatch mobile connection credentials email on demand.
 */
export async function sendMobileConnectEmailAction(
  targetEmail: string,
  includeDemoCredentials = false,
  explicitServerUrl?: string
): Promise<{ ok: boolean; message: string; deepLink?: string }> {
  const email = targetEmail.trim().toLowerCase()
  if (!email || !email.includes('@')) {
    return { ok: false, message: 'Please enter a valid email address.' }
  }

  let requestOrigin: string | null = null
  try {
    const headerList = await headers()
    const host = headerList.get('x-forwarded-host') || headerList.get('host')
    const proto = headerList.get('x-forwarded-proto') || (host && !host.includes('localhost') ? 'https' : 'http')
    if (host) {
      requestOrigin = `${proto}://${host}`
    }
  } catch {}

  const serverUrl =
    explicitServerUrl ||
    (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')
      ? process.env.NEXT_PUBLIC_SITE_URL
      : null) ||
    requestOrigin ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'https://audiobookphile.app'

  const username = includeDemoCredentials ? 'demo@audiobookphile.app' : email.split('@')[0]
  const password = includeDemoCredentials ? 'AudiobookphileDemo2026!' : undefined

  try {
    const result = await sendDeploymentWelcomeEmail({
      to: email,
      username,
      serverUrl,
      password,
      includeAutoLogin: Boolean(password),
    })

    const transportDesc =
      result.transport === 'resend'
        ? 'dispatched via Resend'
        : result.transport === 'sendgrid'
          ? 'dispatched via SendGrid'
          : result.transport === 'postmark'
            ? 'dispatched via Postmark'
            : result.transport === 'smtp'
              ? 'dispatched via SMTP'
              : 'generated and logged'

    return {
      ok: true,
      message: `Credentials & iOS connection link successfully ${transportDesc} to ${email}!`,
      deepLink: result.deepLink,
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return { ok: false, message: `Failed to send email: ${errorMsg}` }
  }
}
