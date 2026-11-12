'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { removeTag as apiRemoveTag, renameTag as apiRenameTag } from '@/shared/lib/api/misc'

export type RemoveTagApiResponse = {
  numItemsUpdated: number
}

export async function removeTag(tag: string): Promise<RemoveTagApiResponse> {
  const validatedTag = z.string().min(1).max(100).parse(tag)
  const { numItemsUpdated } = await apiRemoveTag(validatedTag)
  if (numItemsUpdated > 0) {
    revalidatePath('/settings/item-metadata-utils/tags')
  }
  return { numItemsUpdated }
}

export type RenameTagApiResponse = {
  tagMerged: boolean
  numItemsUpdated: number
}

export async function renameTag(tag: string, newTagName: string): Promise<RenameTagApiResponse> {
  const validatedTag = z.string().min(1).max(100).parse(tag)
  const validatedNewTagName = z.string().min(1).max(100).parse(newTagName)
  const { tagMerged, numItemsUpdated } = await apiRenameTag(validatedTag, validatedNewTagName)
  if (numItemsUpdated > 0) {
    revalidatePath('/settings/item-metadata-utils/tags')
  }
  return { tagMerged, numItemsUpdated }
}
