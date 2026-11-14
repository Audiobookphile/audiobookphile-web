'use server'

import { deleteAccount as apiDeleteAccount } from '@/shared/lib/api/auth'

export async function deleteAccountAction(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await apiDeleteAccount(userId)
    return { success: true }
  } catch (error) {
    console.error('[deleteAccountAction] Error deleting account:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete account',
    }
  }
}
