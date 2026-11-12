import type { SupabaseClient } from '@supabase/supabase-js'
import { apiRequest } from '@/shared/lib/api/client'
import type { SyncReport } from '@/shared/lib/storageSync'
import type { Database } from '@/types/supabase'
import { verifyAdminOrThrow } from '@/shared/utils/supabase/server'

// ---------------------------------------------------------------------------
// Shared: build the sync report
// ---------------------------------------------------------------------------

export async function buildSyncReport(_db?: SupabaseClient<Database>): Promise<SyncReport> {
  await verifyAdminOrThrow()
  console.log('[storage-sync] Building sync report via Edge API...')
  return await apiRequest<SyncReport>('/api/storage-sync', {
    method: 'GET',
  })
}

// ---------------------------------------------------------------------------
// Action: import-orphans
// ---------------------------------------------------------------------------

export async function handleImportOrphans(_db?: SupabaseClient<Database>): Promise<unknown> {
  await verifyAdminOrThrow()
  return await apiRequest<unknown>('/api/storage-sync?action=import-orphans', {
    method: 'POST',
  })
}

// ---------------------------------------------------------------------------
// Action: mark-missing
// ---------------------------------------------------------------------------

export async function handleMarkMissing(_db?: SupabaseClient<Database>): Promise<unknown> {
  await verifyAdminOrThrow()
  return await apiRequest<unknown>('/api/storage-sync?action=mark-missing', {
    method: 'POST',
  })
}

// ---------------------------------------------------------------------------
// Action: cleanup-orphans
// ---------------------------------------------------------------------------

export async function handleCleanupOrphans(_db?: SupabaseClient<Database>): Promise<unknown> {
  await verifyAdminOrThrow()
  return await apiRequest<unknown>('/api/storage-sync?action=cleanup-orphans', {
    method: 'POST',
  })
}
