'use server'

import { changePassword as apiChangePassword } from '@/shared/lib/api/auth'
import { createClient } from '@/shared/utils/supabase/server'

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  if (oldPassword) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user?.email) {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      })
      if (verifyError) {
        throw new Error('Current password is incorrect')
      }
    }
  }

  await apiChangePassword(newPassword)
}
