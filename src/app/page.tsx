import { redirect } from 'next/navigation'
import { createClient } from '@/shared/utils/supabase/server'

export const dynamic = 'force-dynamic'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default async function RootPage() {
  let isAuthed = false
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      isAuthed = true
    }
  } catch {
    // Supabase env vars missing or client failed — safe fallback
  }

  if (isAuthed) {
    redirect('/library')
  } else {
    redirect('/login')
  }
}
