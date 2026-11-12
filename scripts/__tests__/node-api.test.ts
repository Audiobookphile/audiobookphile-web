import { describe, expect, it } from 'bun:test'
import { findNodeApis, isGuardFile, stripComments } from '../node-api'

/**
 * The Node API rules are a security invariant, and an invariant that is
 * wrong is worse than no invariant: it either lets a Node API through, or it
 * blocks work with a false positive and gets switched off.
 *
 * These tests cover both directions, and one property in particular: prose
 * about a Node API is not a Node API. Most of the repository's own history
 * is comments explaining that `require()` and `__dirname` are gone, and a
 * rule that flagged those would have been deleted.
 */

describe('stripComments', () => {
  it('removes block comments', () => {
    expect(stripComments('const a = 1 /* require("fs") */\nconst b = 2')).not.toContain('require')
  })

  it('removes line comments', () => {
    expect(stripComments('const a = 1 // use require() here\nconst b = 2')).not.toContain('require')
  })

  it('does not mistake a URL for a comment', () => {
    const source = "const url = 'https://example.com/path'"
    expect(stripComments(source)).toContain('example.com')
  })
})

describe('findNodeApis', () => {
  it('finds a node: import', () => {
    const findings = findNodeApis("import { readFile } from 'node:fs'")
    expect(findings).toHaveLength(1)
    expect(findings[0].line).toBe(1)
  })

  it('finds a bare node builtin import', () => {
    expect(findNodeApis("import fs from 'fs'")).toHaveLength(1)
  })

  it('finds a bare node builtin in a dynamic import', () => {
    expect(findNodeApis("const fs = await import('fs/promises')")).toHaveLength(1)
  })

  it('does not mistake a string literal for an import', () => {
    // The pattern is anchored on the import syntax, not on the quoted
    // string, so an ordinary string that happens to be a builtin name is
    // not a finding.
    expect(findNodeApis("const label = 'process'")).toEqual([])
    expect(findNodeApis("const kind = 'path'")).toEqual([])
  })

  it('does not mistake a package whose name starts with a builtin for one', () => {
    expect(findNodeApis("import { thing } from 'fs-utils'")).toEqual([])
    expect(findNodeApis("import { thing } from './path'")).toEqual([])
  })

  it('leaves the ambiguous builtin names to the linter', () => {
    // `util`, `events` and `buffer` are also npm package names, and the
    // linter's own rule already covers them. Flagging them here would be a
    // false positive waiting to happen.
    expect(findNodeApis("import { format } from 'util'")).toEqual([])
  })

  it('finds require()', () => {
    expect(findNodeApis('const fs = require("fs")')).toHaveLength(1)
  })

  it('finds __dirname', () => {
    expect(findNodeApis('const here = __dirname')).toHaveLength(1)
  })

  it('finds module.exports', () => {
    expect(findNodeApis('module.exports = {}')).toHaveLength(1)
  })

  it('finds Buffer.from', () => {
    expect(findNodeApis('const b = Buffer.from("x")')).toHaveLength(1)
  })

  it('reports the right line number', () => {
    const findings = findNodeApis('const a = 1\nconst b = 2\nconst c = __dirname\n')
    expect(findings).toHaveLength(1)
    expect(findings[0].line).toBe(3)
  })

  it('does not flag prose about a Node API', () => {
    const source = [
      '/**',
      ' * The old code used require() to load the config.',
      ' * It now uses import.meta.dir.',
      ' */',
      'export const dir = import.meta.dir',
    ].join('\n')

    expect(findNodeApis(source)).toEqual([])
  })

  it('does not flag a line comment about a Node API', () => {
    expect(findNodeApis('// Buffer is not available\nconst b = new Uint8Array()')).toEqual([])
  })

  it('allows process.env', () => {
    // Next.js reads it, and the application reads it on both sides of the
    // client/server boundary.
    expect(findNodeApis('const url = process.env.NEXT_PUBLIC_SUPABASE_URL')).toEqual([])
  })

  it('does not flag an identifier that merely contains a guarded name', () => {
    expect(findNodeApis('const myRequireFn = 1\nconst buffer = 2')).toEqual([])
  })

  it('reports one finding per line, not one per pattern', () => {
    const findings = findNodeApis('const a = __dirname\nconst b = require("fs")')
    expect(findings).toHaveLength(2)
  })
})

describe('isGuardFile', () => {
  it('exempts the files that name the APIs they look for', () => {
    expect(isGuardFile('scripts/pre-commit.ts')).toBe(true)
    expect(isGuardFile('scripts/node-api.ts')).toBe(true)
  })

  it('does not exempt anything else', () => {
    expect(isGuardFile('src/app/page.tsx')).toBe(false)
    expect(isGuardFile('scripts/node-api-scan.ts')).toBe(false)
  })
})
