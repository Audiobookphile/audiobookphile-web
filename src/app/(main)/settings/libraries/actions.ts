'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  createLibrary as apiCreateLibrary,
  deleteLibrary as apiDeleteLibrary,
  updateLibrary as apiUpdateLibrary,
} from '@/shared/lib/api'
import { matchAll as apiMatchAll } from '@/shared/lib/api/items'
import type { GetFilesystemPathsResponse, Library, SaveLibraryOrderApiResponse } from '@/types/api'

const LibraryPayloadSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().max(256).optional(),
    icon: z.string().optional(),
    mediaType: z.string().optional(),
    provider: z.string().optional(),
    displayOrder: z.number().optional(),
  })
  .passthrough()

export async function createLibrary(newLibrary: Library): Promise<Library> {
  try {
    const parsed = LibraryPayloadSchema.parse(newLibrary)
    const library = await apiCreateLibrary(parsed as unknown as Library)
    revalidatePath('/settings/libraries')
    return library
  } catch (error: unknown) {
    throw new Error((error as Error).message, { cause: error })
  }
}

export async function editLibrary(libraryId: string, updatedLibrary: Library): Promise<Library> {
  try {
    const parsed = LibraryPayloadSchema.parse(updatedLibrary)
    const library = await apiUpdateLibrary(libraryId, parsed as unknown as Library)
    revalidatePath('/settings/libraries')
    return library
  } catch (error: unknown) {
    throw new Error((error as Error).message, { cause: error })
  }
}

export async function saveLibraryOrder(
  reorderObjects: { id: string; newOrder: number }[]
): Promise<SaveLibraryOrderApiResponse> {
  try {
    for (const item of reorderObjects) {
      await apiUpdateLibrary(item.id, { displayOrder: item.newOrder } as unknown as Library)
    }
    revalidatePath('/settings/libraries')
    return { libraries: [] }
  } catch (error: unknown) {
    throw new Error((error as Error).message, { cause: error })
  }
}

export async function deleteLibrary(libraryId: string): Promise<Library> {
  try {
    await apiDeleteLibrary(libraryId)
    revalidatePath('/settings/libraries')
    return {} as Library
  } catch (error: unknown) {
    throw new Error((error as Error).message, { cause: error })
  }
}

export async function requestScanLibrary(_libraryId: string): Promise<void> {
  console.warn('[libraries/actions] requestScanLibrary is not available in the Supabase-backed version')
}

export async function matchAll(libraryId: string): Promise<void> {
  try {
    await apiMatchAll(libraryId)
  } catch (error: unknown) {
    throw new Error((error as Error).message, { cause: error })
  }
}

export async function getFilesystemPaths(_path: string, _level: number): Promise<GetFilesystemPathsResponse> {
  console.warn('[libraries/actions] getFilesystemPaths is not available in the Supabase-backed version')
  return { directories: [] } as unknown as GetFilesystemPathsResponse
}
