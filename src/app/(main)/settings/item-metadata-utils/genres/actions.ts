'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { removeGenre as apiRemoveGenre, renameGenre as apiRenameGenre } from '@/shared/lib/api/misc'

export type RemoveGenreApiResponse = {
  numItemsUpdated: number
}

export async function removeGenre(genre: string): Promise<RemoveGenreApiResponse> {
  const validatedGenre = z.string().min(1).max(100).parse(genre)
  const { numItemsUpdated } = await apiRemoveGenre(validatedGenre)
  if (numItemsUpdated > 0) {
    revalidatePath('/settings/item-metadata-utils/genres')
  }
  return { numItemsUpdated }
}

export type RenameGenreApiResponse = {
  genreMerged: boolean
  numItemsUpdated: number
}

export async function renameGenre(genre: string, newGenreName: string): Promise<RenameGenreApiResponse> {
  const validatedGenre = z.string().min(1).max(100).parse(genre)
  const validatedNewGenreName = z.string().min(1).max(100).parse(newGenreName)
  const { genreMerged, numItemsUpdated } = await apiRenameGenre(validatedGenre, validatedNewGenreName)
  if (numItemsUpdated > 0) {
    revalidatePath('/settings/item-metadata-utils/genres')
  }
  return { genreMerged, numItemsUpdated }
}
