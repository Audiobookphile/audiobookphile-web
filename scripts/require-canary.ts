#!/usr/bin/env bun
/**
 * Preflight for the toolchain scripts.
 *
 * The linter and formatter are Bun's own `bun lint` and `bun fmt`. Both ship
 * only in canary builds -- they are not in any released Bun -- so running
 * them on a stable Bun fails with a bare "Script not found", which says
 * nothing about the cause.
 *
 * This runs first (Bun invokes `pre<script>` before `<script>`) and turns
 * that into an actionable message.
 *
 * The check is a feature probe, not a version comparison. A canary reports
 * itself as the next development version (1.4.4 today), so a version check
 * would be wrong twice: wrong on the day the version ships, and wrong for
 * every canary built between releases. Asking the runtime whether it can
 * actually do the job is always right.
 */

const probe = (command: string): boolean => {
  const result = Bun.spawnSync(['bun', command, '--help'], {
    cwd: Bun.env.TMPDIR || '/tmp',
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const output = `${result.stdout.toString()}${result.stderr.toString()}`
  return !output.includes('Script not found')
}

const missing = ['lint', 'fmt'].filter((command) => !probe(command))

if (missing.length > 0) {
  console.error(`
❌ This repository's toolchain needs the Bun canary.

   Found:  Bun ${process.versions.bun}
   Needed: a Bun canary (${missing.map((c) => `bun ${c}`).join(' and ')})

   \`bun lint\` and \`bun fmt\` -- the linter and formatter this project uses --
   are not in any released Bun. They exist only in canary builds.

   Install the canary:
     mise install          # reads .mise.toml, which pins the canary channel
     eval "$(mise activate bash)"   # or: mise activate <your-shell>

   If your shell is already mise-activated, running \`mise install\` inside
   the repository is enough.
`)
  process.exit(1)
}

process.exit(0)
