/**
 * A Bun-native `.env` file loader.
 *
 * The repository used to load these files with the `dotenv` package, which is
 * a Node-era dependency that was never declared here -- it only resolved
 * because it is a transitive dependency of `@sentry/bundler-plugin-core` and
 * Bun's default "hoisted" linker hoisted it into the top level of
 * `node_modules`. Relying on a package you did not ask for is a supply-chain
 * risk and a trap: a change to the Sentry plugin's dependency tree would
 * break the end-to-end suite for no visible reason.
 *
 * Bun loads `.env`, `.env.<mode>` and `.env.local` itself -- but only for
 * processes Bun starts. `bun x` does not, and Playwright's own launcher does
 * not, so the end-to-end suite cannot assume the environment is already
 * populated. This loader is the explicit, dependency-free replacement.
 *
 * Precedence matches both `dotenv` and Bun's own loader:
 *
 *   1. A variable already in the environment always wins. An explicit export
 *      is a deliberate override and a file must never clobber it.
 *   2. `.env.local` wins over `.env`.
 *
 * The parser is deliberately small: it handles `KEY=value`, optional quoting
 * of the value, `#` comments and blank lines. It does not implement
 * dotenv's multi-line or escape-sequence syntax, and nothing in this
 * repository uses those.
 */
const QUOTED_VALUE = /^["'](.*)["']$/

/**
 * Load `.env.local` and `.env` from `dir` into the environment.
 *
 * Values already present in the environment are left alone, so an explicit
 * export always wins over a file.
 *
 * The environment is `Bun.env`, not `process.env`. In Bun the two are the
 * same store -- a write to either is visible through the other -- so this
 * changes nothing observable, but it is the API that belongs to this
 * runtime, and `Bun.env` reads and writes the real process environment
 * rather than a copy of it.
 */
export async function loadEnv(dir: string): Promise<void> {
  // `.env.local` first, `.env` second, and the first definition of a variable
  // wins: the local file is the more specific one, so it must take precedence
  // over the shared file. This is the same order and the same
  // "never override what is already set" rule the old `dotenv.config` calls
  // used.
  for (const name of ['.env.local', '.env']) {
    const handle = Bun.file(`${dir}/${name}`)
    if (!(await handle.exists())) continue

    for (const line of (await handle.text()).split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      const index = trimmed.indexOf('=')
      if (index === -1) continue

      const key = trimmed.slice(0, index).trim()
      if (!key || Bun.env[key] !== undefined) continue

      const raw = trimmed.slice(index + 1).trim()
      const quoted = QUOTED_VALUE.exec(raw)
      Bun.env[key] = quoted ? quoted[1] : raw
    }
  }
}
