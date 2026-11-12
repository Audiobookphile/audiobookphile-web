/**
 * Reading a `.vercelignore`.
 *
 * The format is gitignore's: one pattern per line, `!` in front of a
 * pattern to re-include what an earlier pattern excluded, `#` for a
 * comment, and a blank line for nothing. The last pattern that matches a
 * path decides its fate, so an exclusion followed by a re-inclusion leaves
 * the path included.
 *
 * Only the subset that matters here is implemented, and it is implemented
 * properly rather than approximately: a pattern that does the wrong thing
 * on a path is worse than no pattern, because the check this exists for is
 * "is this file going to be there".
 *
 * The rules, from the gitignore documentation:
 *
 *   - A pattern with a `/` anywhere but at the end is anchored to the
 *     directory the ignore file is in. `/scripts/*` matches `scripts/x.ts`
 *     and not `src/scripts/x.ts`.
 *   - A pattern with no `/` matches at any level: `*.log` matches
 *     `a.log` and `deep/a.log`.
 *   - `*` matches anything except `/`; `**` matches anything, `/`
 *     included; `?` matches one character except `/`.
 *   - A trailing `/` matches directories only. Every path this module is
 *     asked about is a file, so a directory pattern is treated as "this
 *     directory and everything under it".
 */

export interface IgnorePattern {
  /** The pattern as it was written, for the error message. */
  readonly source: string
  /** Whether the pattern re-includes rather than excludes. */
  readonly negated: boolean
  /** Whether the pattern matches. */
  readonly matches: (path: string) => boolean
}

/**
 * Turn one glob into a regular expression.
 *
 * The translation is done by walking the pattern rather than by replacing
 * pieces of it, because `*` and `**` overlap and a naive replacement gets
 * the boundary between them wrong.
 */
const globToRegExp = (glob: string, anchored: boolean): RegExp => {
  let source = ''

  for (let index = 0; index < glob.length; index++) {
    const character = glob[index]

    if (character === '*') {
      const isDouble = glob[index + 1] === '*'
      if (isDouble) {
        index++
        // `**/` matches nothing, so that `**/foo` matches `foo` as well as
        // `a/b/foo`. A trailing `**` matches everything under the prefix.
        if (glob[index + 1] === '/') {
          index++
          source += '(?:.*/)?'
        } else {
          source += '.*'
        }
      } else {
        source += '[^/]*'
      }
      continue
    }

    if (character === '?') {
      source += '[^/]'
      continue
    }

    source += character.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }

  const prefix = anchored ? '^' : '^(?:.*/)?'
  return new RegExp(`${prefix}${source}(?:/.*)?$`)
}

/**
 * Parse the contents of a `.vercelignore`.
 */
export const parseIgnore = (contents: string): { ignores: (path: string) => boolean } => {
  const patterns: IgnorePattern[] = []

  for (const raw of contents.split('\n')) {
    const line = raw.trim()
    if (line === '' || line.startsWith('#')) continue

    const negated = line.startsWith('!')
    const body = negated ? line.slice(1) : line
    if (body === '') continue

    // A trailing slash means "directories only". Every path asked about
    // here is a file, so the pattern matches the directory and everything
    // under it.
    const directoryOnly = body.endsWith('/')
    const glob = directoryOnly ? body.slice(0, -1) : body
    // A slash anywhere but at the end anchors the pattern to the root, and
    // a leading slash is that anchor rather than part of the path.
    const anchored = glob.includes('/')
    const trimmed = glob.startsWith('/') ? glob.slice(1) : glob

    const regexp = globToRegExp(trimmed, anchored)
    patterns.push({
      source: line,
      negated,
      matches: (path) => regexp.test(path),
    })
  }

  return {
    /**
     * Whether the path is excluded.
     *
     * The last pattern that matches decides, which is gitignore's rule: an
     * exclusion followed by a re-inclusion leaves the path included.
     */
    ignores: (path: string): boolean => {
      let ignored = false
      for (const pattern of patterns) {
        if (pattern.matches(path)) ignored = !pattern.negated
      }
      return ignored
    },
  }
}
