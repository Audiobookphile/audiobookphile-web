'use client'

/**
 * Filter encoding utilities for library filter values.
 * Matches the Vue implementation's $encode and $decode functions.
 *
 * The encoding is plain UTF-8 to base64 and back, using only web-standard
 * globals: `TextEncoder`, `TextDecoder`, `btoa` and `atob`. Those exist in the
 * browser and in Bun alike, so there is no environment fork and no Node
 * `Buffer` in the module. `Buffer` was the last Node global left in the
 * application source, and the pre-commit gate's Node API guard keeps it out.
 */

/**
 * Encode a string to base64, handling Unicode characters properly.
 */
function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
  return btoa(binary)
}

/**
 * Decode a base64 string to UTF-8, handling Unicode characters properly.
 */
function base64ToUtf8(base64: string): string {
  const binary = atob(base64)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/**
 * Encode a filter value for use in API queries.
 * Converts text to base64 then URL-encodes it.
 */
export function filterEncode(text: string): string {
  const base64 = utf8ToBase64(text)
  return encodeURIComponent(base64)
}

/**
 * Decode a filter value from API format.
 * URL-decodes then converts from base64.
 */
export function filterDecode(text: string): string {
  const decoded = decodeURIComponent(text)
  return base64ToUtf8(decoded)
}
