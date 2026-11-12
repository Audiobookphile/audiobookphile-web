'use server'

/**
 * ABS-specific backup actions — not available in the Supabase-backed version.
 */

export async function createBackup(): Promise<void> {
  console.warn('[backups/actions] createBackup is not available in the Supabase-backed version')
}

export async function deleteBackup(_backupId: string): Promise<void> {
  console.warn('[backups/actions] deleteBackup is not available in the Supabase-backed version')
}

export async function applyBackup(_backupId: string): Promise<void> {
  console.warn('[backups/actions] applyBackup is not available in the Supabase-backed version')
}

export async function updateBackupPath(_path: string): Promise<boolean> {
  console.warn('[backups/actions] updateBackupPath is not available in the Supabase-backed version')
  return false
}
