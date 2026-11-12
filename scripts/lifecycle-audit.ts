#!/usr/bin/env bun
/**
 * Audit the packages whose lifecycle scripts Bun refused to run.
 *
 * Bun does not execute a dependency's `install` or `postinstall` script
 * unless the package is in `trustedDependencies`. That is the default, and
 * it is the right default: a lifecycle script is arbitrary code that runs
 * the moment a developer types `bun install`.
 *
 * The blocked scripts are not invisible, though — `bun pm untrusted` lists
 * them — and a package that wants to run code at install time is exactly
 * the thing a supply-chain review should look at. The problem is that the
 * list grows silently: a new dependency arrives, it wants to run a script,
 * Bun blocks it, the install succeeds, and nothing in the diff says a
 * package just asked for the ability to execute code on every machine that
 * installs the project.
 *
 * This script makes that diff visible. It reads the list, and fails when a
 * package appears that is not on the baseline below.
 *
 * The baseline is an allow-list of packages whose blocked script is known
 * and harmless. Every entry says why.
 */

const REPO_ROOT = `${import.meta.dir}/..`

/**
 * Packages whose blocked lifecycle script is known to be harmless.
 *
 * The reason is the important part. "It is fine" is not a reason; "it
 * prints a donation banner" is.
 */
const ALLOWED: Record<string, string> = {
  '@parcel/watcher':
    'its install script builds the native watcher from source when no prebuilt binary matches the platform. It is a build-time dependency of next-intl.',
  'core-js': 'its postinstall script only prints a donation banner.',
}

/**
 * Read the list of packages whose scripts Bun blocked.
 *
 * `bun pm untrusted` prints:
 *
 *   ./node_modules/<name> @<version>
 *    » [<script>]: <the command>
 */
const blockedPackages = (): string[] => {
  const result = Bun.spawnSync(['bun', 'pm', 'untrusted'], {
    cwd: REPO_ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const output = `${result.stdout.toString()}${result.stderr.toString()}`
  const names = new Set<string>()

  for (const line of output.split('\n')) {
    const match = line.match(/^\.\/node_modules\/(\S+)\s+@/)
    if (match?.[1]) names.add(match[1])
  }

  return [...names].sort()
}

function main(): void {
  const blocked = blockedPackages()

  if (blocked.length === 0) {
    console.log('✅ No dependency has an untrusted lifecycle script.')
    process.exit(0)
  }

  const unexpected = blocked.filter((name) => !(name in ALLOWED))

  if (unexpected.length > 0) {
    console.error(
      `❌ ${unexpected.length} package(s) want to run a lifecycle script that Bun refused to run:\n` +
        unexpected.map((name) => `   ${name}`).join('\n') +
        `\n\nA lifecycle script is arbitrary code that runs the moment somebody installs this project.\n` +
        `Review what the script does before adding the package to trustedDependencies in package.json, and add it to\n` +
        `ALLOWED in scripts/lifecycle-audit.ts with the reason it is safe.`
    )
    process.exit(1)
  }

  console.log(`✅ ${blocked.length} package(s) have a blocked lifecycle script, all on the baseline:`)
  for (const name of blocked) {
    console.log(`   ${name} — ${ALLOWED[name]}`)
  }
  process.exit(0)
}

try {
  main()
} catch (error) {
  console.error('lifecycle audit failed:', error)
  process.exit(1)
}

// A module, not a script: TypeScript gives every script file a shared global
// scope, so two of these declaring `main` would collide.
export {}
