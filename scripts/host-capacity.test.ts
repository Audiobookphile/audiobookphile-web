import { $ } from 'bun'
import { afterEach, beforeEach, expect, test } from 'bun:test'

const KIB = 1024
const GIB = 1024 * 1024 * 1024
const library = `${import.meta.dir}/linux-host-pressure.sh`
let root: string
beforeEach(async () => {
  root = `${Bun.env.TMPDIR ?? '/tmp'}/audio-capacity-${crypto.randomUUID()}`
  await $`mkdir -p ${root}/cgroup`.quiet()
})
afterEach(async () => {
  await $`rm -rf ${root}`.quiet()
})
const host = {
  MemTotal: 12 * 1024 * 1024,
  MemAvailable: 7 * 1024 * 1024,
  SwapTotal: 6 * 1024 * 1024,
  SwapFree: 2 * 1024 * 1024,
}
const counters = {
  'memory.max': String(4 * GIB),
  'memory.current': String(GIB),
  'memory.swap.max': String(3 * GIB),
  'memory.swap.current': String(GIB),
}
async function fixture(memory = host, files: Record<string, string> = counters) {
  await Bun.write(
    `${root}/meminfo`,
    Object.entries(memory)
      .map(([key, value]) => `${key}: ${value} kB`)
      .join('\n') + '\n'
  )
  await Promise.all(Object.entries(files).map(([name, value]) => Bun.write(`${root}/cgroup/${name}`, `${value}\n`)))
}
function snapshot() {
  return Bun.spawnSync([
    'bash',
    '-c',
    'source "$1"; linux_capacity_snapshot "$2" "$3"',
    'test',
    library,
    `${root}/meminfo`,
    `${root}/cgroup`,
  ])
}
function values() {
  const result = snapshot()
  expect(result.exitCode).toBe(0)
  return result.stdout.toString().trim().split(/\s+/).map(Number)
}
function check(data: string, report = false, thresholds: Record<string, string> = {}) {
  return Bun.spawnSync(
    [
      'bash',
      '-c',
      'source "$1"; linux_capacity_snapshot() { printf "%s\n" "$TEST_SNAPSHOT"; }; linux_pressure_main "$2"',
      'test',
      library,
      report ? '--report' : '',
    ],
    {
      env: {
        ...Bun.env,
        TEST_SNAPSHOT: data,
        CI_MIN_RESIDENT_MIB: '2048',
        CI_MIN_FREE_MEM_PCT: '10',
        CI_MIN_FREE_SWAP_PCT: '5',
        CI_GATE_ON_LOAD: '0',
        CI_MAX_LOAD_PER_CORE: '4',
        ...thresholds,
      },
    }
  )
}
test('current host and worker constraints both bound headroom', async () => {
  await fixture()
  expect(values()).toEqual([
    host.MemTotal,
    host.MemAvailable,
    host.SwapTotal,
    host.SwapFree,
    (4 * GIB) / KIB,
    (3 * GIB) / KIB,
    (3 * GIB) / KIB,
    (2 * GIB) / KIB,
  ])
})
test('an oversized or unlimited cgroup never promises occupied host memory', async () => {
  for (const limit of [String(32 * GIB), 'max']) {
    await fixture(host, { ...counters, 'memory.max': limit, 'memory.swap.max': limit })
    expect(values()).toEqual([...Object.values(host), ...Object.values(host)])
  }
})
test('used swap and resident limits remain separate', async () => {
  await fixture(host, {
    ...counters,
    'memory.max': String(GIB / 2),
    'memory.current': String(GIB / 4),
    'memory.swap.current': String(2 * GIB),
  })
  const data = values()
  expect(data[5]).toBe(256 * 1024)
  expect(data[7]).toBe(1024 * 1024)
  expect(check(data.join(' ')).exitCode).toBe(1)
  expect(check(data.join(' '), true).exitCode).toBe(0)
})
test('no physical swap is valid when resident headroom is sufficient', async () => {
  await fixture({ ...host, SwapTotal: 0, SwapFree: 0 })
  const data = values()
  expect(data[6]).toBe(0)
  expect(data[7]).toBe(0)
  expect(check(data.join(' ')).exitCode).toBe(0)
})
test('unknown or inconsistent host counters never establish headroom', async () => {
  for (const data of [
    '',
    'MemTotal: 12 kB\n',
    'MemTotal: 1 kB\nMemAvailable: 2 kB\nSwapTotal: 0 kB\nSwapFree: 0 kB\n',
    'MemTotal: 12 kB\nMemTotal: 12 kB\nMemAvailable: 2 kB\nSwapTotal: 0 kB\nSwapFree: 0 kB\n',
  ]) {
    await fixture()
    await Bun.write(`${root}/meminfo`, data)
    expect(snapshot().exitCode).not.toBe(0)
  }
})
test('missing malformed or multi-line cgroup counters fail closed', async () => {
  for (const value of ['', '-1', 'NaN', 'max\n123', '123\n456']) {
    await fixture(host, { ...counters, 'memory.max': value })
    expect(snapshot().exitCode).not.toBe(0)
  }
  await fixture()
  await $`rm ${root}/cgroup/memory.current`.quiet()
  expect(snapshot().exitCode).not.toBe(0)
})
test('over-limit usage gives zero remaining capacity and never wraps', async () => {
  await fixture(host, { ...counters, 'memory.current': String(5 * GIB), 'memory.swap.current': String(4 * GIB) })
  const data = values()
  expect(data[5]).toBe(0)
  expect(data[7]).toBe(0)
  expect(check(data.join(' ')).exitCode).toBe(1)
})
test('sub-KiB remainders are rounded down at the resident threshold', async () => {
  await fixture(host, { ...counters, 'memory.max': String(2 * GIB - 1), 'memory.current': '0' })
  const data = values()
  expect(data[5]).toBe((2 * GIB) / KIB - 1)
  expect(check(data.join(' ')).exitCode).toBe(1)
})
test('invalid thresholds cannot turn an unknown setting into success', async () => {
  await fixture()
  const data = values().join(' ')
  for (const value of ['invalid', '0', '-1', '99999999999999999'])
    expect(check(data, false, { CI_MIN_RESIDENT_MIB: value }).exitCode).toBe(1)
  expect(check(data, false, { CI_MIN_FREE_MEM_PCT: '101' }).exitCode).toBe(1)
  expect(check(data, false, { CI_MIN_FREE_MEM_PCT: '08' }).exitCode).toBe(0)
})
test('unknown snapshot fails check but report mode remains diagnostic', () => {
  for (const report of [false, true]) {
    const result = Bun.spawnSync([
      'bash',
      '-c',
      'source "$1"; linux_capacity_snapshot() { return 1; }; linux_pressure_main "$2"',
      'test',
      library,
      report ? '--report' : '',
    ])
    expect(result.exitCode).toBe(report ? 0 : 1)
  }
})

test('current physical pressure cannot be hidden by generous cgroup ceilings', async () => {
  await fixture({ ...host, MemAvailable: 1024 * 1024, SwapFree: 0 }, { ...counters, 'memory.max': String(32 * GIB) })
  const data = values()
  expect(data[5]).toBe(1024 * 1024)
  expect(data[7]).toBe(0)
  expect(check(data.join(' ')).exitCode).toBe(1)
})
