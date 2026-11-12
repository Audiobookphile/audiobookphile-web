/**
 * Escapes HTML entities in a string to prevent XSS attacks when rendering
 * user-provided content in React components (though React escapes by default,
 * this provides an extra layer of safety for dynamically constructed strings
 * or raw HTML rendering).
 */
export function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return ''
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
