#!/usr/bin/env bun
/**
 * The lint-debt ratchet.
 *
 * Some type-aware rules are still deferred: the fixes they ask for change
 * behaviour in screens the end-to-end suite cannot reach, and the repo
 * sequences them as their own piece of work. Leaving a rule switched off
 * means the debt grows silently -- a new un-awaited promise is not reported
 * anywhere, because the rule that would report it is off.
 *
 * This turns that into a number that can only go down.
 *
 * For each deferred rule, the linter is run with that rule switched on, and
 * the number of violations is compared with the baseline recorded in
 * `bunfig.toml` under `[lint.debt]`. A rule with more violations than its
 * baseline fails the gate. A rule with fewer is reported, so the baseline
 * can be lowered and the debt marked as paid.
 *
 * Nothing in the application is changed by this, and no rule is enforced
 * retroactively: the point is that the next violation is caught, rather than
 * joining 52 that nobody is counting.
 *
 * One rule is linted per run, on purpose. Bun's linter drops type-aware
 * rules when several are switched on at once -- asking for
 * `no-unsafe-member-access` alongside four others reports zero for it,
 * against 355 on its own -- and a ratchet that cannot see a violation is
 * worse than no ratchet.
 */

const REPO_ROOT = `${import.meta.dir}/..`

interface Bunfig {
  'lint-debt'?: Record<string, number>
}

const bunfig = Bun.TOML.parse(await Bun.file(`${REPO_ROOT}/bunfig.toml`).text()) as Bunfig
const debt = bunfig['lint-debt'] ?? {}

if (Object.keys(debt).length === 0) {
  console.error(
    '❌ No lint-debt baselines found.\n' +
      '   Expected a [lint-debt] table in bunfig.toml, mapping each deferred rule to the\n' +
      '   number of violations it currently has.\n\n' +
      '   It is a top-level table rather than a sub-table of [lint] because Bun\n' +
      '   validates the [lint] table it knows and rejects a key it does not, and\n' +
      '   that error takes the whole lint configuration with it.'
  )
  process.exit(1)
}

/**
 * The number of violations of one rule.
 */
const countViolations = (rule: string): number => {
  const result = Bun.spawnSync(['bun', 'lint', `--rule`, `${rule}:error`, '--format', 'unix', '--all'], {
    cwd: REPO_ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const output = `${result.stdout.toString()}${result.stderr.toString()}`
  return output.split('\n').filter((line) => line.includes(`Error/${rule}]`)).length
}

function main(): void {
  const grown: string[] = []
  const shrinkable: string[] = []

  console.log('📉 Lint debt:')

  for (const [rule, baseline] of Object.entries(debt)) {
    const count = countViolations(rule)
    const delta = count - baseline

    if (count > baseline) {
      grown.push(`   ${rule}: ${count} violations, baseline is ${baseline} (+${delta})`)
    } else if (count < baseline) {
      shrinkable.push(`   ${rule}: ${count} violations, baseline is ${baseline} (${delta})`)
    } else {
      console.log(`   ${rule}: ${count}`)
    }
  }

  if (grown.length > 0) {
    console.error(
      `\n❌ The lint debt grew:\n${grown.join('\n')}\n\n` +
        '   These rules are deferred, not disabled: the debt is counted and may shrink,\n' +
        '   but a new violation means the count is no longer the number that was\n' +
        '   reviewed. Either fix the violation, or -- if it is the same shape as the\n' +
        '   ones already there -- raise the baseline in bunfig.toml and say why.'
    )
    process.exit(1)
  }

  if (shrinkable.length > 0) {
    console.log(`\n   The debt shrank. Lower the baseline in bunfig.toml:\n${shrinkable.join('\n')}`)
  }

  console.log('\n✅ The lint debt did not grow.')
  process.exit(0)
}

try {
  main()
} catch (error) {
  console.error('lint debt ratchet failed:', error)
  process.exit(1)
}
