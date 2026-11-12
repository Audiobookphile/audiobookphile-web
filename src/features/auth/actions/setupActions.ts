'use server'

import { createClient } from '@/shared/utils/supabase/server'
import { createServiceRoleClient } from '@/shared/utils/supabase/service-role'

export interface SetupResult {
  ok: boolean
  error?: string
  redirectTo?: string
}

/**
 * Creates the initial Root Administrator account during template onboarding.
 * Strictly guarded: can ONLY be called once when no admin/root accounts exist.
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

  // 1. Double-check that no admin or root account exists
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

    if (!countError && typeof count === 'number' && count > 0) {
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

    // 3. Authenticate the newly created root user
    const client = await createClient()
    const { error: signInError } = await client.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      // Account created, but sign-in requires manual credentials entry
      return { ok: true, redirectTo: '/login' }
    }

    return { ok: true, redirectTo: '/library' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}
