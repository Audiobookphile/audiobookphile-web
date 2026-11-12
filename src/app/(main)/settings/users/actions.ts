'use server'

import { revalidatePath } from 'next/cache'
import { deleteUser as apiDeleteUser, getLibraries } from '@/shared/lib/api'
import type { Library } from '@/types/api'

export async function deleteUser(userId: string): Promise<void> {
  try {
    await apiDeleteUser(userId)
    revalidatePath('/settings/users')
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error), { cause: error })
  }
}

export async function fetchLibraries(): Promise<Library[]> {
  try {
    const response = await getLibraries()
    return response.libraries
  } catch {
    return []
  }
}

export async function fetchTags(): Promise<string[]> {
  return [] // Tags are not fully implemented via API yet
}
