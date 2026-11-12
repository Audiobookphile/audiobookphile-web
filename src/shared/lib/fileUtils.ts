export const SupportedFileTypes = {
  image: ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'svg'],
  audio: [
    'm4b',
    'mp3',
    'm4a',
    'flac',
    'opus',
    'ogg',
    'oga',
    'mp4',
    'aac',
    'wma',
    'aiff',
    'aif',
    'wav',
    'webm',
    'webma',
    'mka',
    'awb',
    'caf',
    'mpeg',
    'mpg',
    'mkv',
    'avi',
    'mov',
    'm4v',
    'wmv',
    'flv',
    'mts',
    'm2ts',
    'vob',
    'ogv',
    'rmvb',
    'asf',
    '3gp',
  ],
  ebook: ['epub', 'pdf', 'mobi', 'azw', 'azw3', 'cbr', 'cbz', 'fb2', 'djvu', 'prc'],
  info: ['nfo'],
  text: ['txt'],
  metadata: ['opf', 'abs', 'xml', 'json', 'cue', 'lrc'],
}

/**
 * Returns the extension of a filename including the leading dot,
 * or empty string if no extension or if file is a dotfile (.hidden).
 */
export function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.')
  if (lastDotIndex <= 0) return ''
  return filename.slice(lastDotIndex)
}

// ── POSIX path helpers ─────────────────────────────────────────────────────
//
// These three used to come from Node's `path` module. The upload flow runs
// in the browser, where Next.js shipped a `path` polyfill: a Node shim
// bundled into client code on a project that runs on Bun.
//
// The operations below are the only ones the upload flow needs, with the
// same POSIX semantics the polyfill had.

/**
 * The final segment of a POSIX path.
 *
 * `extension` is stripped when the segment ends with it, matching Node's
 * `path.basename(path, extension)`.
 */
export function getPathBasename(filepath: string, extension?: string): string {
  if (!filepath) return ''

  // Trailing slashes are not part of the name, but a lone root is.
  const trimmed = filepath.replace(/\/+$/, '')
  if (!trimmed) return filepath.startsWith('/') ? '/' : ''

  const basename = trimmed.slice(trimmed.lastIndexOf('/') + 1)
  if (extension && extension.length > 0 && basename.length >= extension.length && basename.endsWith(extension)) {
    return basename.slice(0, -extension.length)
  }
  return basename
}

/**
 * The directory portion of a POSIX path, matching Node's `path.dirname`.
 *
 * Returns '.' when the path has no directory component, and '/' for a path
 * directly under the root.
 */
export function getPathDirname(filepath: string): string {
  if (!filepath) return '.'

  const trimmed = filepath.replace(/\/+$/, '')
  if (!trimmed) return filepath.startsWith('/') ? '/' : '.'

  const lastSlash = trimmed.lastIndexOf('/')
  if (lastSlash === -1) return '.'
  if (lastSlash === 0) return '/'
  return trimmed.slice(0, lastSlash)
}

/**
 * The extension of a path's final segment, including the leading dot.
 *
 * Matches Node's `path.extname`: a dotfile has no extension, and only the
 * final segment is considered.
 */
export function getPathExtension(filepath: string): string {
  return getFileExtension(getPathBasename(filepath))
}

export const sanitizeFileName = (filename: string, colonReplacement = ' - '): string => {
  if (typeof filename !== 'string') {
    return ''
  }

  // Most file systems use number of bytes for max filename
  // to support most filesystems we will use max of 255 bytes in utf-16
  const MAX_FILENAME_BYTES = 255
  const replacement = ''
  const illegalRe = /[/?<>\\:*|"]/g
  // Control characters are exactly what this regex exists to strip, so
  // no-control-regex is a false positive here.
  // eslint-disable-next-line no-control-regex
  const controlRe = /[\x00-\x1f\x80-\x9f]/g
  const reservedRe = /^\.+$/
  const windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i
  const windowsTrailingRe = /[. ]+$/
  const lineBreaks = /[\n\r]/g

  let sanitized = filename
    .replace(':', colonReplacement) // Replace first occurrence of a colon
    .replace(illegalRe, replacement)
    .replace(controlRe, replacement)
    .replace(reservedRe, replacement)
    .replace(lineBreaks, replacement)
    .replace(windowsReservedRe, replacement)
    .replace(windowsTrailingRe, replacement)
    .replace(/\s+/g, ' ') // Replace consecutive spaces with a single space

  // Check if basename is too many bytes
  const ext = getFileExtension(sanitized)
  const basename = ext ? sanitized.slice(0, -ext.length) : sanitized

  // Use Blob instead of Node.js Buffer for browser compatibility
  const getByteLength = (str: string) => new Blob([str]).size
  const extByteLength = getByteLength(ext)
  const basenameByteLength = getByteLength(basename)

  if (basenameByteLength + extByteLength > MAX_FILENAME_BYTES) {
    const maxBytesForBasename = MAX_FILENAME_BYTES - extByteLength
    let totalBytes = 0
    let trimmedBasename = ''

    // Add chars until max bytes is reached
    for (const char of basename) {
      totalBytes += getByteLength(char)
      if (totalBytes > maxBytesForBasename) break
      else trimmedBasename += char
    }

    trimmedBasename = trimmedBasename.trim()
    sanitized = trimmedBasename + ext
  }

  return sanitized
}
