#!/usr/bin/env bun
/**
 * The files a deployment needs, checked against `.vercelignore`.
 *
 * Vercel builds this repository with `bun run build`, and that build ends
 * with `bun run typecheck` -- which is `scripts/tsrs.ts`, which imports
 * `scripts/tsrs-resolve.ts`. `.vercelignore` excludes `scripts/*`, because
 * the directory is development tooling and none of it belongs in a
 * deployment.
 *
 * That is a fine default and a sharp edge. A file the build needs, left
 * behind by the exclusion, fails the build at the *last* step -- after the
 * whole compile, after the static generation, after everything that takes
 * minutes. And it fails on Vercel only, so it is not something a local
 * build would ever have caught.
 *
 * So the list of files the build needs is derived rather than remembered:
 * every script `package.json` and `bunfig.toml` name, plus everything those
 * files import, checked against the patterns in `.vercelignore`. A file
 * that is needed and excluded is reported by name, and the gate fails.
 */

import { parseIgnore } from './vercelignore'

const REPO_ROOT = `${import.meta.dir}/..`

/**
 * The scripts a deployment runs.
 *
 * Not every script in `package.json` -- most of them are development
 * tooling that has no business in a deployment. A Vercel build runs two
 * things: `bun install`, which runs the `prepare` hook and the configured
 * scanner, and `bun run build`, which is the build and the type gate.
 */
const DEPLOYMENT_SCRIPTS = ['prepare', 'build'] as const

/**
 * The files those scripts name, following `bun run <script>` through.
 *
 * `build` ends with `bun run typecheck`, and `typecheck` is
 * `bun run scripts/tsrs.ts --noEmit` -- so the type gate is reached by
 * following the script chain rather than by guessing which scripts are
 * relevant.
 */
const declaredPaths = async (): Promise<string[]> => {
  const manifest = (await Bun.file(`${REPO_ROOT}/package.json`).json()) as { scripts?: Record<string, string> }
  const scripts: Record<string, string> = manifest.scripts ?? {}
  const paths = new Set<string>()

  const visit = (name: string, seen: Set<string>): void => {
    if (seen.has(name)) return
    seen.add(name)

    const command = scripts[name]
    if (typeof command !== 'string') return

    for (const match of command.matchAll(/\bscripts\/[\w.-]+\.(?:ts|js|mjs)\b/g)) {
      paths.add(match[0])
    }

    // `bun run <other>` is a reference to another script.
    for (const match of command.matchAll(/\bbun run ([\w:.-]+)(?!\s*--)/g)) {
      const referenced = match[1]
      if (referenced in scripts) visit(referenced, seen)
    }
  }

  const seen = new Set<string>()
  for (const name of DEPLOYMENT_SCRIPTS) visit(name, seen)

  // The scanner bunfig.toml configures is read by Bun during `bun install`,
  // before any script runs, and a configured scanner that cannot be found
  // fails the install outright.
  const bunfig = await Bun.file(`${REPO_ROOT}/bunfig.toml`).text()
  for (const match of bunfig.matchAll(/scanner\s*=\s*"([^"]+)"/g)) {
    paths.add(match[1].replace(/^\.\//, ''))
  }

  return [...paths]
}

/**
 * The relative imports of a file, as repository-relative paths.
 *
 * Only relative imports count. A bare specifier is a package, and packages
 * are installed rather than copied.
 */
const localImports = async (file: string): Promise<string[]> => {
  const source = await Bun.file(`${REPO_ROOT}/${file}`).text()
  const found: string[] = []

  for (const match of source.matchAll(/\bfrom\s+['"](\.[^'"]+)['"]/g)) {
    const specifier = match[1]
    const directory = file.split('/').slice(0, -1)
    const parts = [...directory, ...specifier.split('/')]
    const resolved: string[] = []
    for (const part of parts) {
      if (part === '.' || part === '') continue
      if (part === '..') resolved.pop()
      else resolved.push(part)
    }
    found.push(resolved.join('/'))
  }

  return found
}

/**
 * Every file the build needs: the declared ones, and everything they import.
 *
 * The closure matters: `scripts/tsrs.ts` is named by `package.json`, but it
 * is useless without the module it imports, and that module is exactly the
 * kind of file someone adds and forgets.
 */
const requiredFiles = async (): Promise<string[]> => {
  const seen = new Set<string>()
  const queue = await declaredPaths()

  while (queue.length > 0) {
    const file = queue.shift() as string
    if (seen.has(file)) continue
    seen.add(file)

    // Only TypeScript and JavaScript files have imports worth following.
    if (!/\.(?:ts|tsx|js|mjs)$/.test(file)) continue
    for (const imported of await localImports(file)) {
      const candidates = [imported, `${imported}.ts`, `${imported}.tsx`, `${imported}/index.ts`]
      for (const candidate of candidates) {
        if (await Bun.file(`${REPO_ROOT}/${candidate}`).exists()) {
          queue.push(candidate)
          break
        }
      }
    }
  }

  return [...seen]
}

const main = async (): Promise<void> => {
  const ignorePath = `${REPO_ROOT}/.vercelignore`
  if (!(await Bun.file(ignorePath).exists())) {
    console.log('✅ No .vercelignore, so nothing is excluded.')
    return
  }

  const patterns = parseIgnore(await Bun.file(ignorePath).text())
  const required = await requiredFiles()

  const excluded = required.filter((file) => patterns.ignores(file))

  if (excluded.length === 0) {
    console.log(`✅ The ${required.length} file(s) the build needs are not excluded by .vercelignore.`)
    return
  }

  console.error('❌ These files are needed by the build, and .vercelignore excludes them:')
  for (const file of excluded) {
    console.error(`   ${file}`)
  }
  console.error('')
  console.error('   A deployment would fail at the last step of the build, on Vercel only.')
  console.error('   Re-include each one in .vercelignore, with a ! prefix.')
  process.exit(1)
}

await main()
