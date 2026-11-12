import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'
import { getSupabaseAnonKey, getSupabaseUrl } from './env'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

import { getCurrentUser } from '@/shared/lib/api/users'

export async function verifyAdminOrThrow() {
  const currentUser = await getCurrentUser()
  if (!currentUser?.user) throw new Error('Unauthorized')

  if (currentUser.user.type !== 'admin' && currentUser.user.type !== 'root') {
    throw new Error('Forbidden: Admin privileges required')
  }

  return currentUser.user
}
