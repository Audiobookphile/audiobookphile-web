#!/usr/bin/env bun
/**
 * Host-pressure preflight for self-hosted CI runners.
 *
 * All three audiobookphile repos run on ONE macOS host, each with its own
 * self-hosted runner. When two heavy jobs land at once the box starts swapping,
 * the OOM killer takes the biggest process, and the job dies in a way that reads
 * like a product failure: `ERR_CONNECTION_REFUSED on /login`, a Swift compiler
 * that vanishes, a Playwright locator that never appears. Every one of those was
 * already mistaken for a real bug in this repo -- see the retry-on-connection-
 * refused path in scripts/e2e-library.ts, which exists because of exactly this.
 *
 * So the host is treated as a dependency and checked BEFORE the expensive work
 * starts. Starvation is reported as starvation -- naming the actual memory hog --
 * instead of surfacing two minutes later as a mystery.
 *
 * Usage:
 *   bun run scripts/host-pressure.ts            # gate: fail fast if the host is starved
 *   bun run scripts/host-pressure.ts --report   # diagnostics only, always exits 0
 *
 * Thresholds (override per-host if the box changes):
 *   CI_MIN_FREE_MEM_PCT   default 10    memory_pressure "free percentage"
 *   CI_MIN_FREE_SWAP_PCT  default 5     swap free / swap total
 *   CI_MIN_FREE_DISK_GB    default 5     free space on the volume holding the repo
 *   CI_MAX_LOAD_PER_CORE  default 4     1-minute load average / logical CPUs
 */

const MODE = process.argv.includes('--report') ? 'report' : 'check'

const REPO_ROOT = `${import.meta.dir}/..`

const MIN_FREE_MEM_PCT = Number(process.env.CI_MIN_FREE_MEM_PCT ?? 10)
const MIN_FREE_SWAP_PCT = Number(process.env.CI_MIN_FREE_SWAP_PCT ?? 5)
const MIN_FREE_DISK_GB = Number(process.env.CI_MIN_FREE_DISK_GB ?? 5)
const MAX_LOAD_PER_CORE = Number(process.env.CI_MAX_LOAD_PER_CORE ?? 4)

// Load is reported but does NOT fail the gate unless this is set.
//
// The failure this script exists to prevent is the OOM killer taking `next dev`,
// a Swift compiler or a simulator out mid-job. That is a MEMORY event. Load
// average counts runnable and uninterruptible tasks, which on a workstation that
// legitimately runs several agents at once is high as a matter of course --
// measured at 4.1/core here with 46% of memory free and every build running at
// full speed. Gating on it would have refused to start work on a perfectly
// healthy box, and a gate that cries wolf gets disabled, which costs the real
// signal. Set CI_GATE_ON_LOAD=1 to opt back in where load genuinely is the thing
// you are trying to catch.
const GATE_ON_LOAD = process.env.CI_GATE_ON_LOAD === '1'

const run = (cmd: string[]): string => {
  const result = Bun.spawnSync(cmd, { stdout: 'pipe', stderr: 'ignore' })
  return result.exitCode === 0 ? result.stdout.toString() : ''
}

const CORES = Number(run(['sysctl', '-n', 'hw.logicalcpu']).trim() || run(['getconf', '_NPROCESSORS_ONLN']).trim() || 1)

/**
 * The free space on the volume holding `path`.
 *
 * `df -Pk` is the POSIX output format, so the columns are the same on
 * macOS and Linux: filesystem, 1024-blocks, used, available, capacity,
 * mount point. The available column is the fourth.
 *
 * The volume that matters is the one holding the repository, not the root
 * volume: on macOS the root is a separate, much smaller system volume, and
 * a check against `/` reports a number that has nothing to do with where
 * the build writes.
 */
export const diskFree = (path: string): { freePct: number; freeGb: number; totalGb: number } => {
  const output = run(['df', '-Pk', path])
  const line = output.trim().split('\n').pop() ?? ''
  const columns = line.trim().split(/\s+/)

  const totalKiB = Number(columns[1])
  const availableKiB = Number(columns[3])
  if (!Number.isFinite(totalKiB) || !Number.isFinite(availableKiB) || totalKiB <= 0) {
    return { freePct: Number.NaN, freeGb: Number.NaN, totalGb: Number.NaN }
  }

  return {
    freePct: Math.floor((availableKiB * 100) / totalKiB),
    freeGb: Math.floor(availableKiB / 1024 / 1024),
    totalGb: Math.floor(totalKiB / 1024 / 1024),
  }
}

/**
 * `memory_pressure` is the same signal the OS uses to decide when to start
 * reclaiming aggressively, and it already accounts for the file cache. It is
 * the honest number; free page counts are not.
 */
export const memFreePct = async (): Promise<string> => {
  const output = run(['memory_pressure'])
  const match = output.match(/System-wide memory free percentage: (\d+)%/)
  if (match) return match[1]

  // Linux fallback so the gate is not useless if the fleet ever moves.
  if (await Bun.file('/proc/meminfo').exists()) {
    const meminfo = await Bun.file('/proc/meminfo').text()
    const total = Number(meminfo.match(/^MemTotal:\s+(\d+)/m)?.[1] ?? 0)
    const available = Number(meminfo.match(/^MemAvailable:\s+(\d+)/m)?.[1] ?? 0)
    if (total > 0) return String(Math.floor((available * 100) / total))
  }
  return ''
}

export const swapFreePct = async (): Promise<string> => {
  const usage = run(['sysctl', '-n', 'vm.swapusage'])
  if (usage) {
    const free = Number(usage.match(/free = ([\d.]+)[MG]/)?.[1] ?? 0)
    const total = Number(usage.match(/total = ([\d.]+)[MG]/)?.[1] ?? 0)
    if (total > 0) return String(Math.floor((free * 100) / total))
  }
  if (await Bun.file('/proc/meminfo').exists()) {
    const meminfo = await Bun.file('/proc/meminfo').text()
    const total = Number(meminfo.match(/^SwapTotal:\s+(\d+)/m)?.[1] ?? 0)
    const free = Number(meminfo.match(/^SwapFree:\s+(\d+)/m)?.[1] ?? 0)
    return total > 0 ? String(Math.floor((free * 100) / total)) : '100'
  }
  return ''
}

// macOS reports load as "{ 11.42 5.88 3.57 }" -- a brace is the first field, so
// a naive split would yield "{" and the per-core maths silently becomes 0.
// That bug would make a thrashing host look idle, which is worse than having
// no gate at all.
export const loadPerCore = (): string => {
  const raw = run(['sysctl', '-n', 'vm.loadavg']) || run(['cat', '/proc/loadavg'])
  const load = Number(raw.replace(/[{}]/g, '').trim().split(/\s+/)[0])
  if (Number.isNaN(load)) return '0.0'
  return (load / CORES).toFixed(1)
}

export const hostCores = CORES

/**
 * The total resident memory of the processes whose command line mentions a
 * path fragment, in megabytes.
 *
 * Used to follow one process -- the dev server -- while it runs, so that a
 * report can say "it died at 3.2 GB" instead of "the host looked fine",
 * which is what a snapshot taken after the process is gone says.
 */
export const rssOfMatching = (fragment: string): number => {
  const ps = run(['ps', '-A', '-o', 'rss=,command='])
  let kilobytes = 0

  for (const line of ps.split('\n')) {
    if (!line.includes(fragment)) continue
    const match = line.trim().match(/^(\d+)\s+/)
    if (match?.[1]) kilobytes += Number(match[1])
  }

  return Math.floor(kilobytes / 1024)
}

/**
 * The point of the gate is that the log NAMES the process eating the box. A
 * bare "host is busy" sends the next person hunting through Activity Monitor.
 * `basename` is not enough -- a Kotlin compile daemon's comm is just "java" --
 * so the tail of the command line is kept, which is where the project path and
 * the daemon class actually live.
 */
const topHogs = (): string => {
  const ps = run(['ps', '-A', '-o', 'rss=,command='])
  const lines = ps
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const match = line.trim().match(/^(\d+)\s+(.*)$/)
      return match ? { rss: Number(match[1]), cmd: match[2] } : null
    })
    .filter((entry): entry is { rss: number; cmd: string } => entry !== null)
    .sort((a, b) => b.rss - a.rss)
    .slice(0, 3)

  return lines
    .map(({ rss, cmd }) => {
      const parts = cmd.split(/\s+/)
      const tail = parts
        .slice(Math.max(parts.length - 5, 0))
        .join(' ')
        .slice(0, 96)
      return `      ${String(Math.floor(rss / 1024)).padStart(6)} MB  ${tail || cmd.split('/').pop() || cmd}`
    })
    .join('\n')
}

async function main(): Promise<void> {
  const MEM_PCT = await memFreePct()
  const SWAP_PCT = await swapFreePct()
  const LPC = loadPerCore()
  const disk = diskFree(REPO_ROOT)
  const memsize = run(['sysctl', '-n', 'hw.memsize']).trim()
  const TOTAL_GB = memsize ? String(Math.round(Number(memsize) / 1073741824)) : '?'

  console.log(
    `🖥️  Host pressure: ${MEM_PCT || '?'}% memory free, ${SWAP_PCT || '?'}% swap free, load ${LPC}/core (${CORES} cores, ${TOTAL_GB}GB)`
  )
  console.log(
    `    disk: ${Number.isNaN(disk.freePct) ? '?' : disk.freePct}% free (${Number.isNaN(disk.freeGb) ? '?' : disk.freeGb} GB of ${Number.isNaN(disk.totalGb) ? '?' : disk.totalGb} GB)`
  )
  console.log(
    `    thresholds: memory>=${MIN_FREE_MEM_PCT}% swap>=${MIN_FREE_SWAP_PCT}% disk>=${MIN_FREE_DISK_GB}GB load<=${MAX_LOAD_PER_CORE}/core`
  )

  const violations: string[] = []
  const notes: string[] = []

  if (MEM_PCT && Number(MEM_PCT) < MIN_FREE_MEM_PCT) {
    violations.push(`only ${MEM_PCT}% of memory is free (< ${MIN_FREE_MEM_PCT}%)`)
  }
  if (SWAP_PCT && Number(SWAP_PCT) < MIN_FREE_SWAP_PCT) {
    violations.push(`only ${SWAP_PCT}% of swap is free (< ${MIN_FREE_SWAP_PCT}%) -- the host is already thrashing`)
  }
  if (!Number.isNaN(disk.freeGb) && disk.freeGb < MIN_FREE_DISK_GB) {
    // The absolute number, not the percentage: a build needs a gigabyte or
    // two whatever the volume is sized, and a 460 GB volume at 5% is 23 GB
    // free, which is plenty. Failing on a percentage would refuse to work
    // on a big disk that has plenty of room.
    violations.push(
      `only ${disk.freeGb} GB of disk is free (< ${MIN_FREE_DISK_GB} GB) -- ${disk.freePct}% of ${disk.totalGb} GB`
    )
  }
  if (Number(LPC) > MAX_LOAD_PER_CORE) {
    const message = `load average is ${LPC} per core (> ${MAX_LOAD_PER_CORE})`
    if (GATE_ON_LOAD) violations.push(message)
    else notes.push(message)
  }

  if (violations.length === 0) {
    console.log('    ✅ host has headroom for a build')
    // Load is reported but not gated on by default: see the note above. A busy
    // host slows a build down; it does not kill it.
    if (notes.length > 0) console.log(`    ℹ️  ${notes.join(' ')} (informational)`)
    process.exit(0)
  }

  if (MODE === 'report') {
    console.log(`    ⚠️  under pressure: ${violations.join(' ')}`)
    if (notes.length > 0) console.log(`    ℹ️  ${notes.join(' ')}`)
    console.log(topHogs())
    process.exit(0)
  }

  console.error(`

❌ HOST STARVED -- refusing to start a build that will be blamed on the product.
   ${violations.join(' ')}

   Largest resident processes right now:
${topHogs()}

   This is infrastructure, not a regression. The self-hosted runners for all
   three audiobookphile repos share this one host, so the box is only ever as
   healthy as whatever else is running on it. Diagnose in this order:

     1. Another build on this host. A Gradle/Kotlin compile of an unrelated
        project is the usual culprit -- check the project path in the list
        above. It belongs to whoever started it; do not kill it from CI.
     2. A leftover from an earlier CI job:
         pkill -f KotlinCompileDaemon; pkill -f GradleDaemon
         xcrun simctl shutdown all
     3. Genuinely just busy: wait, or re-run once the load average decays.

   A full disk is its own failure, and a confusing one: the build does not
   say "the disk is full", it says something about a file it could not write.
   The things worth reclaiming in this repository:

     bun run clean                    # the .next build output
     rm -rf ~/.cache/ms-playwright    # the durable browser cache, if the
                                      # e2e gate is not about to run

   To override the gate for a deliberate one-off:
     CI_MIN_FREE_MEM_PCT=0 CI_MIN_FREE_SWAP_PCT=0 CI_MIN_FREE_DISK_GB=0 \\
       bun run scripts/host-pressure.ts
`)
  process.exit(1)
}

// The gate runs when this file is executed, not when it is imported.
//
// scripts/e2e-library.ts imports the measurements from here to sample the
// host *while* the suite runs, and it must not have the preflight fire as
// a side effect of that import.
if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error('host-pressure preflight failed:', error)
    process.exit(1)
  })
}
