#!/usr/bin/env bun
/**
 * Format the non-JS/TS files in a commit: CSS, Markdown, and anything else
 * Bun's formatter understands.
 *
 * Usage: bun run scripts/format-other.ts <files...>
 */

const files = process.argv.slice(2)
if (files.length === 0) {
  process.exit(0)
}

// Bun's own formatter handles every language it supports, so the old split
// into "biome for CSS, prettier for everything else" collapses into one
// command with one config (bunfig.toml). Markdown is excluded there so
// hand-aligned tables in the docs keep their alignment.
const result = Bun.spawnSync(['bun', 'fmt', ...files], {
  cwd: `${import.meta.dir}/..`,
  stdio: ['inherit', 'inherit', 'inherit'],
})

process.exit(result.exitCode ?? 0)

// A module, not a script: TypeScript gives every script file a shared global
// scope, so two of these declaring `main` would collide.
export {}
