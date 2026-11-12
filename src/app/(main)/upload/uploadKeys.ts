import { sanitizeFileName } from '@/shared/lib/fileUtils'

/**
 * Upload key helpers — preserve folder structure in B2 storage keys.
 *
 * The backend finalize gate (MULTIPLE_WORKS_DETECTED) and folder-aware
 * playback signing read each file's folder chain from its storagePath.
 * Flattening keys to `bookId/basename` (the old behavior) destroys that
 * signal AND lets same-named tracks from different subfolders overwrite
 * each other — the Dark Psychology incident (4 books, one "Chapter N.mp3"
 * scheme each). Keys are therefore built relative to the item's own
 * directory: unique within the item, stable for the backend to reason about.
 */

/** Directory portion of a webkitRelativePath ('' for bare filenames). */
export function dirName(path: string | undefined): string {
  if (!path) return ''
  const idx = path.lastIndexOf('/')
  return idx === -1 ? '' : path.slice(0, idx)
}

/**
 * Longest common '/'-bounded directory prefix across paths.
 * Bare filenames contribute no directory, so mixed selections collapse to ''.
 */
export function commonDirPrefix(paths: (string | undefined)[]): string {
  const dirs = paths.map(dirName).filter((d) => d.length > 0)
  if (dirs.length === 0) return ''
  const split = dirs.map((d) => d.split('/'))
  const first = split[0]
  let len = first.length
  for (const parts of split.slice(1)) {
    let i = 0
    while (i < len && i < parts.length && parts[i] === first[i]) i++
    len = i
    if (len === 0) break
  }
  return first.slice(0, len).join('/')
}

/** Sanitize each '/'-separated segment (never the separators themselves). */
export function sanitizeRelPath(relPath: string): string {
  return relPath
    .split('/')
    .map((seg) => sanitizeFileName(seg))
    .filter((seg) => seg.length > 0)
    .join('/')
}

/**
 * B2 storage key for one file: `<bookId>/<path relative to the item dir>`.
 * Falls back to the bare filename when no relative path survives
 * sanitization. Pure and fully backward compatible: flat selections produce
 * exactly the old `bookId/basename` keys.
 */
export function buildStorageKey(
  bookId: string,
  filepath: string | undefined,
  filename: string,
  commonPrefix: string
): string {
  let rel = filepath && filepath.length > 0 ? filepath : filename
  if (commonPrefix && rel.startsWith(commonPrefix + '/')) {
    rel = rel.slice(commonPrefix.length + 1)
  }
  const clean = sanitizeRelPath(rel)
  const safe = clean.length > 0 ? clean : sanitizeFileName(filename)
  return `${bookId}/${safe.length > 0 ? safe : filename}`
}
