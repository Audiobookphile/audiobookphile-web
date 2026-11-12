/**
 * The rules for "this repository has no Node.js runtime".
 *
 * One definition, used by two gates: the pre-commit gate, which looks at the
 * files in a commit, and `scripts/node-api-scan.ts`, which looks at the
 * whole tree. Two copies of a rule is one copy too many -- they drift, and
 * then the guard that is supposed to be the strict one ends up being the
 * lenient one.
 *
 * The rules cover the two ways a module can reach for Node:
 *
 *   * **importing** a Node builtin -- `import 'node:fs'`, `import fs from
 *     'fs'`, `require('fs')`
 *   * **using** a Node global that needs no import -- `Buffer`,
 *     `__dirname`, `module.exports`
 *
 * `process.env` is deliberately allowed. Next.js reads it, the application
 * reads it on both sides of the client/server boundary, and it is the
 * documented way to read configuration in a Next.js app.
 *
 * The `node:` specifier is checked here as well as by the linter's
 * `import/no-nodejs-modules` rule. The linter rule is configuration -- it
 * can be turned off, and its `allow` list has to grow every time `bun:test`
 * needs to be permitted -- while this is the repository's own statement of
 * what the invariant is. One rule that can be disabled is not an invariant.
 */

/**
 * Files that necessarily name every API they look for, and are therefore
 * excluded from the scan.
 *
 * A guard that reports itself cannot be committed, and a guard that gets
 * deleted protects nothing.
 *
 * The test file is here for the same reason as the rules themselves: it
 * asserts that each API is detected, so it has to spell each one out.
 */
export const GUARD_FILES: string[] = [
  'scripts/pre-commit.ts',
  'scripts/node-api.ts',
  'scripts/__tests__/node-api.test.ts',
]

/**
 * The Node builtins a module can import by their bare name.
 *
 * The linter's `import/no-nodejs-modules` rule covers the full list of
 * Node builtins. This is the subset whose names are not also the names of
 * npm packages a web application might plausibly depend on -- `util`,
 * `events`, `buffer` and the rest of that family are left to the linter,
 * because flagging `import { format } from 'util'` on the assumption that
 * it means Node's `util` would be a false positive waiting to happen.
 *
 * The two lists overlap on purpose. The linter can be switched off; this
 * cannot.
 */
export const NODE_BUILTINS = [
  'assert',
  'assert/strict',
  'async_hooks',
  'child_process',
  'cluster',
  'constants',
  'crypto',
  'dgram',
  'dns',
  'domain',
  'fs',
  'fs/promises',
  'http',
  'http2',
  'https',
  'inspector',
  'net',
  'os',
  'path',
  'path/posix',
  'path/win32',
  'perf_hooks',
  'process',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  'stream/promises',
  'stream/web',
  'string_decoder',
  'timers',
  'timers/promises',
  'tls',
  'trace_events',
  'tty',
  'v8',
  'vm',
  'wasi',
  'zlib',
] as const

/**
 * Strip comments before scanning for Node APIs.
 *
 * The guard looks for identifiers like `require(` and `__dirname`, and prose
 * about them is common: this file names them, and comments elsewhere explain
 * why they are gone. Scanning raw text would flag the explanation along with
 * the code.
 *
 * Block comments are removed wholesale. Line comments are removed from a `//`
 * that is not preceded by a colon, so a URL in a string (`https://...`) is not
 * mistaken for the start of a comment. This is a heuristic, not a parser: the
 * worst it can do is skip a line that contains `//` inside a string, which
 * costs a false negative on that one line -- never a false positive.
 */
export const stripComments = (content: string): string =>
  content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/(^|[^:])\/\/.*$/, '$1'))
    .join('\n')

/**
 * The patterns, in the order they are reported.
 *
 * Each one is a single line of source that should not exist in a repository
 * that runs on Bun.
 */
export const NODE_API_PATTERNS: { pattern: RegExp; api: string }[] = [
  { pattern: /\bBuffer\s*\.\s*(from|alloc|allocUnsafe|isBuffer|concat)\b/, api: 'Buffer' },
  { pattern: /(^|[^.\w])(__dirname|__filename)\b/, api: '__dirname / __filename' },
  { pattern: /\brequire\s*\(/, api: 'require()' },
  { pattern: /\bmodule\s*\.\s*exports\b/, api: 'module.exports' },
  { pattern: /\bprocess\s*\.\s*binding\s*\(/, api: 'process.binding()' },
  { pattern: /^\s*exports\s*\./, api: 'exports.*' },
  { pattern: /(['"])node:[a-z_/-]+(['"])/, api: 'a node: import' },
  {
    // A bare builtin import: `from 'fs'`, `import 'crypto'`, `import('path')`.
    //
    // The pattern is anchored on the import syntax, not on the quoted
    // string, so that an ordinary string literal -- `const label = 'process'`
    // -- is not mistaken for an import.
    //
    // The specifier has to be the whole of the quoted string, so
    // `from 'fs/promises'` is judged on its own terms and a package called
    // `fs-utils` is not mistaken for Node's `fs`.
    pattern: new RegExp(
      `(?:\\bfrom\\s*|\\bimport\\s*|\\bimport\\s*\\(\\s*|\\brequire\\s*\\(\\s*)(['"])(?:${NODE_BUILTINS.join('|')})\\1`
    ),
    api: 'a Node builtin import',
  },
]

/**
 * The Node API usages in a piece of source, as `line number: text` strings.
 *
 * The line numbers are relative to the file the content came from, so the
 * caller has to keep the content and the line numbering in step.
 */
export const findNodeApis = (content: string): { line: number; text: string; api: string }[] => {
  const findings: { line: number; text: string; api: string }[] = []
  const stripped = stripComments(content)

  stripped.split('\n').forEach((line, index) => {
    for (const { pattern, api } of NODE_API_PATTERNS) {
      if (pattern.test(line)) {
        findings.push({ line: index + 1, text: line.trim(), api })
        break
      }
    }
  })

  return findings
}

/**
 * Whether a file is one of the guard files, and so exempt from the scan.
 */
export const isGuardFile = (file: string): boolean => GUARD_FILES.some((guard) => file.endsWith(guard))

/**
 * The message shown when a Node API is found.
 *
 * It lives here, in a file that is exempt from the scan, because it names
 * every API it is looking for. A message written inline in a caller would
 * have to be exempt too, and the exemption list is shorter when there is
 * one message.
 */
export const NODE_API_MESSAGE = [
  'Use the web-standard equivalents: Buffer -> Uint8Array / btoa / atob,',
  '__dirname -> import.meta.dir, require() -> import,',
  'node:fs -> Bun.file, node:path -> import.meta.dir.',
].join(' ')
