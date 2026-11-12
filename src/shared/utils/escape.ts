/**
 * Utility to manually escape strings to prevent XSS.
 * Note: React automatically escapes content rendered inside JSX (e.g. {item.name}),
 * but this is useful if you are rendering raw HTML or passing strings to third-party APIs.
 */
export function escape(str: string): string {
  if (typeof str !== 'string') return str
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Strips HTML tags from a string.
 */
export function stripHtml(str: string): string {
  if (typeof str !== 'string') return str
  return str.replace(/<\/?[^>]+(>|$)/g, '')
}
