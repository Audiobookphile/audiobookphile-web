#!/usr/bin/env bun
/**
 * Regenerate the Supabase database types for this repository.
 *
 * This replaces the shell pipeline the script used to be:
 *
 *   cd ../audiobookphile-backend && bunx supabase gen types typescript --linked \
 *     > ../audiobookphile-web/src/types/supabase.ts
 *
 * Three things were wrong with that. It needed a shell, with `cd` and a
 * redirect, so it could not run from anywhere but the repository root. It
 * went through `bunx`, which resolves the package from the registry rather
 * than from `node_modules` -- so the CLI version could drift from the pinned
 * one, and a network round-trip was in the critical path of a routine task.
 * And it wrote the file by redirecting stdout, so a warning printed to
 * stdout would have been written into a TypeScript file.
 *
 * This script does the same job with no shell and no `bunx`: the Supabase
 * CLI's native binary is resolved by `scripts/supabase.ts` and spawned
 * directly, its stdout is captured separately from its stderr, and the file
 * is written only from stdout.
 *
 * The CLI has to run from the backend repository, because that is where the
 * Supabase project configuration lives -- `--linked` reads the project ref
 * from the linked project's `supabase/.temp/project-ref`.
 */

const REPO_ROOT = `${import.meta.dir}/..`
const BACKEND_DIR = `${REPO_ROOT}/../audiobookphile-backend`
const OUTPUT = `${REPO_ROOT}/src/types/supabase.ts`

if (!(await Bun.file(`${BACKEND_DIR}/supabase/config.toml`).exists())) {
  console.error(
    `❌ Cannot find the Supabase project at ${BACKEND_DIR}.\n` +
      `   The type generator has to run from the backend repository, because --linked reads the linked project's configuration from there.`
  )
  process.exit(1)
}

// `--linked` reads the project reference from the linked project's temp
// directory, which only exists once `supabase link` has run on that machine.
// Without this check the failure is a stack trace from deep inside the CLI,
// which says nothing about the actual cause.
if (!(await Bun.file(`${BACKEND_DIR}/supabase/.temp/project-ref`).exists())) {
  console.error(
    `❌ The backend repository is not linked to a Supabase project.\n` +
      `   ${BACKEND_DIR}/supabase/.temp/project-ref does not exist.\n` +
      `   Run this once on this machine:\n\n` +
      `     bun run supabase -- link --project-ref <your-project-ref>\n`
  )
  process.exit(1)
}

console.log('🔄 Generating Supabase types...')

const child = Bun.spawn(['bun', `${REPO_ROOT}/scripts/supabase.ts`, 'gen', 'types', 'typescript', '--linked'], {
  cwd: BACKEND_DIR,
  stdout: 'pipe',
  stderr: 'inherit',
})

const types = await new Response(child.stdout).text()
const exitCode = await child.exited

if (exitCode !== 0) {
  console.error(`❌ supabase gen types failed (exit code ${exitCode}).`)
  process.exit(exitCode)
}

if (types.trim().length === 0) {
  console.error('❌ supabase gen types produced no output. The file was left untouched.')
  process.exit(1)
}

await Bun.write(OUTPUT, types)
console.log(`✅ Types written to ${OUTPUT}`)

// A module, not a script: TypeScript gives every script file a shared global
// scope, so two of these declaring `main` would collide.
export {}
