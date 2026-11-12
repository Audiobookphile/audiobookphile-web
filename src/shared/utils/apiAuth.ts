import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAnonKey, getSupabaseUrl } from './supabase/env'

export async function requireApiAuth(request: Request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

  if (!token) {
    return { user: null, supabase: null, token: null }
  }

  const supabaseUrl = getSupabaseUrl()
  const supabaseKey = getSupabaseAnonKey()

  const supabase = createSupabaseClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token)

  if (userError || !user) {
    return { user: null, supabase: null, token: null }
  }

  return { user, supabase, token }
}
