import { describe, expect, it } from 'bun:test'
import { parseIgnore } from '../vercelignore'

/**
 * Reading a `.vercelignore`.
 *
 * The check this exists for asks one question about one file: is it going
 * to be there? A matcher that is wrong in the permissive direction hides a
 * broken deployment, and one that is wrong in the strict direction sends
 * the reader after a file that was never in trouble.
 *
 * So both directions are pinned down here, and the re-include rule is
 * pinned down hardest, because that is the one this repository depends on:
 * `/scripts/*` followed by `!/scripts/tsrs.ts`.
 */

describe('parseIgnore', () => {
  it('ignores comments and blank lines', () => {
    const { ignores } = parseIgnore('# a comment\n\n   \n')
    expect(ignores('anything.ts')).toBe(false)
  })

  it('excludes a file by its exact path', () => {
    const { ignores } = parseIgnore('/query.ts\n')
    expect(ignores('query.ts')).toBe(true)
  })

  it('anchors a pattern that contains a slash', () => {
    // `/scripts/*` is about this repository's scripts directory, and not
    // about any directory that happens to be called scripts.
    const { ignores } = parseIgnore('/scripts/*\n')
    expect(ignores('scripts/tsrs.ts')).toBe(true)
    expect(ignores('src/scripts/tsrs.ts')).toBe(false)
  })

  it('matches a pattern without a slash at any level', () => {
    const { ignores } = parseIgnore('*.log\n')
    expect(ignores('a.log')).toBe(true)
    expect(ignores('deep/nested/a.log')).toBe(true)
    expect(ignores('a.txt')).toBe(false)
  })

  it('re-includes what an earlier pattern excluded', () => {
    const { ignores } = parseIgnore('/scripts/*\n!/scripts/tsrs.ts\n')
    expect(ignores('scripts/prepare.ts')).toBe(true)
    expect(ignores('scripts/tsrs.ts')).toBe(false)
  })

  it('lets the last matching pattern decide', () => {
    // This is the rule that makes a re-include work at all: the exclusion
    // comes first and the re-inclusion second, and the second one wins.
    const { ignores } = parseIgnore('/scripts/*\n!/scripts/a.ts\n/scripts/a.ts\n')
    expect(ignores('scripts/a.ts')).toBe(true)
  })

  it('treats a trailing slash as the directory and everything under it', () => {
    const { ignores } = parseIgnore('/scripts/\n')
    expect(ignores('scripts/a.ts')).toBe(true)
    expect(ignores('scripts/nested/a.ts')).toBe(true)
  })

  it('handles a double star', () => {
    const { ignores } = parseIgnore('/build/**\n')
    expect(ignores('build/a.ts')).toBe(true)
    expect(ignores('build/nested/a.ts')).toBe(true)
    expect(ignores('builder/a.ts')).toBe(false)
  })

  it('handles a single star as not crossing a slash', () => {
    const { ignores } = parseIgnore('/scripts/*.ts\n')
    expect(ignores('scripts/a.ts')).toBe(true)
    expect(ignores('scripts/nested/a.ts')).toBe(false)
  })

  it("reads this repository's own .vercelignore the way it is meant", () => {
    // The list the repository actually ships: the whole scripts directory
    // is out, and four files come back.
    const { ignores } = parseIgnore(
      [
        '/scripts/*',
        '!/scripts/prepare.ts',
        '!/scripts/security-scanner.ts',
        '!/scripts/tsrs.ts',
        '!/scripts/tsrs-resolve.ts',
      ].join('\n')
    )
    expect(ignores('scripts/prepare.ts')).toBe(false)
    expect(ignores('scripts/security-scanner.ts')).toBe(false)
    expect(ignores('scripts/tsrs.ts')).toBe(false)
    expect(ignores('scripts/tsrs-resolve.ts')).toBe(false)
    expect(ignores('scripts/pre-commit.ts')).toBe(true)
    expect(ignores('src/app/page.tsx')).toBe(false)
  })
})
