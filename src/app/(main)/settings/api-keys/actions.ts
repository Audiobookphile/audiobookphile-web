'use server'

import type { CreateApiKeyPayload, CreateUpdateApiKeyResponse } from '@/types/api'

/**
 * ABS-specific API key actions — not available in the Supabase-backed version.
 */

export async function deleteApiKey(_apiKeyId: string): Promise<void> {
  console.warn('[api-keys/actions] deleteApiKey is not available in the Supabase-backed version')
}

export async function createApiKey(_payload: CreateApiKeyPayload): Promise<CreateUpdateApiKeyResponse> {
  console.warn('[api-keys/actions] createApiKey is not available in the Supabase-backed version')
  return {} as CreateUpdateApiKeyResponse
}

export async function updateApiKey(
  _apiKeyId: string,
  _payload: CreateApiKeyPayload
): Promise<CreateUpdateApiKeyResponse> {
  console.warn('[api-keys/actions] updateApiKey is not available in the Supabase-backed version')
  return {} as CreateUpdateApiKeyResponse
}
