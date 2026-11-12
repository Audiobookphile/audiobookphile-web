'use server'

import type { CreateCustomMetadataProviderPayload, CreateCustomMetadataProviderResponse } from '@/types/api'

/**
 * ABS-specific — not available in the Supabase-backed version.
 */
export async function createCustomMetadataProvider(
  _payload: CreateCustomMetadataProviderPayload
): Promise<CreateCustomMetadataProviderResponse> {
  console.warn(
    '[custom-metadata-providers/actions] createCustomMetadataProvider is not available in the Supabase-backed version'
  )
  return {} as CreateCustomMetadataProviderResponse
}

export async function deleteCustomMetadataProvider(_providerId: string): Promise<void> {
  console.warn(
    '[custom-metadata-providers/actions] deleteCustomMetadataProvider is not available in the Supabase-backed version'
  )
}
