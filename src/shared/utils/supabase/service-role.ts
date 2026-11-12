/**
 * Supabase service-role client.
 *
 * This client is initialised with `SUPABASE_SERVICE_ROLE_KEY` which bypasses
 * Row Level Security entirely. It MUST only be used in server-side code
 * (Route Handlers, Server Actions, API module functions). Never import this
 * file from client components or expose the key to the browser.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { getSupabaseServiceRoleKey, getSupabaseUrl } from './env'

/**
 * Returns a Supabase client that uses the service role key.
 * Bypasses RLS — use only for admin operations (uploads, user management, etc.).
 *
 * Environment variable lookup order:
 *  1. `SUPABASE_SERVICE_ROLE_KEY` — canonical name; set this in all environments.
 *  2. `SUPABASE_SECRET_KEY`       — Vercel Marketplace Supabase integration name.
 *  3. `SUPABASE_SERVICE_KEY`      — legacy alias accepted via the `??` fallback.
 */
export function createServiceRoleClient() {
  const supabaseUrl = getSupabaseUrl()
  const serviceRoleKey = getSupabaseServiceRoleKey()

  if (!supabaseUrl) {
    throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL')
  }
  if (!serviceRoleKey) {
    throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY')
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      // Disable automatic session persistence — this is a server-only client.
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
