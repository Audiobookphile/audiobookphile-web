/**
 * Storage Sync Utilities Types
 * The business logic is now handled in the Supabase Edge Function `storage-sync`.
 */

export interface StorageObject {
  /** Full path/key within the bucket */
  key: string
  /** Size in bytes */
  size: number
  /** Last modified timestamp */
  lastModified: Date | null
  /** Which storage backend this object lives in */
  source: 'supabase' | 'b2'
}

export interface OrphanedGroup {
  /** The parent directory path, or the file path if it's at root */
  dirPath: string
  /** Inferred book title from the directory name */
  inferredTitle: string
  /** The files belonging to this group */
  files: {
    storagePath: string
    source: 'supabase' | 'b2'
    size: number
  }[]
}

export interface MissingFileItem {
  /** library_items.id */
  libraryItemId: string
  /** library_items.title */
  title: string
  /** The storage path that's referenced but missing */
  missingPath: string
  /** Which source was expected */
  source: 'supabase' | 'b2'
}

export interface SyncReport {
  /** Grouped orphaned files */
  orphanedGroups: OrphanedGroup[]
  /** DB records pointing to non-existent storage files */
  missingFiles: MissingFileItem[]
  /** Total files in storage */
  totalStorageFiles: number
  /** Total storage paths referenced in DB */
  totalDbPaths: number
  /** Timestamp of this report */
  generatedAt: string
}
