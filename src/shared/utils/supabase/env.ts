/**
 * Centralized Supabase environment resolver for Vercel Template deployments.
 *
 * Supports both canonical names, Vercel Supabase Integration auto-injected names,
 * and legacy aliases:
 *  - URL: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_URL
 *  - Anon Key: NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_ANON_KEY, SUPABASE_PUBLISHABLE_KEY
 *  - Service Role Key: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SECRET_KEY, SUPABASE_SERVICE_KEY
 */

export function getSupabaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ''
  return url.replace(/\/+$/, '')
}

export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    ''
  )
}

export function getSupabaseServiceRoleKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    ''
  )
}

export function getSupabaseEnv() {
  return {
    url: getSupabaseUrl(),
    anonKey: getSupabaseAnonKey(),
    serviceRoleKey: getSupabaseServiceRoleKey(),
  }
}

