#!/usr/bin/env bun
/**
 * Client bundle budget.
 *
 * This replaces `size-limit`, which was a Node-only tool whose whole job was
 * to measure one number, and which dragged a puppeteer-core and webpack tree
 * into the dependency graph to do it. The measurement itself needs a glob
 * and a compressor; this script does both with nothing installed.
 *
 * ## The two numbers
 *
 * **The total** is every client chunk the browser can be asked to download.
 * It is what the container image serves, and it is the number the original
 * budget was.
 *
 * **The initial payload** is the chunks one route loads when it is first
 * visited. That is what a visitor waits for.
 *
 * They are different numbers, and they fail differently, so they need
 * different budgets.
 *
 * A library in the *initial* payload is paid for by every visitor on every
 * page. A library in a route's own chunk is paid for by the visitors of
 * that route. hls.js is 172 KB gzipped, and it used to be in the app
 * shell's chunk graph: every authenticated page shipped it, to play a
 * stream most of them never play. The total budget never saw that --
 * the chunk was still in the build either way, so the total did not move.
 * The initial-payload budget sees it, because that is the number a
 * visitor waits for.
 *
 * So the total is still measured, and the initial payload is measured
 * beside it, and both are budgets.
 *
 * ## How each is measured
 *
 * The total is the sum of the client chunks, compressed with gzip at level
 * 9, summed per file.
 *
 * Per file, not over the concatenation: each chunk is a separate HTTP
 * response with its own `Content-Encoding` header, so the bytes on the wire
 * are the sum of the individually compressed files. Compressing the
 * concatenation would let one chunk's dictionary inflate the next one's
 * apparent size.
 *
 * The initial payload comes from Next's own route manifests: every
 * `page_client-reference-manifest.js` lists the chunks that the client
 * modules of that route load, and a route's manifest includes the chunks
 * of the layouts above it -- which is exactly the set the browser is asked
 * for when the route is first visited.
 *
 * gzip rather than brotli because Bun has no brotli API, and `node:zlib` --
 * the one route to it -- is a Node builtin, which this repository does not
 * use. gzip is what every browser negotiates, it is within about 20% of
 * brotli on minified JavaScript, and `Bun.gzipSync` is a single call.
 *
 * The raw size is reported alongside it. The container image serves
 * uncompressed, so the raw number is the worst case for that deployment; the
 * compressed number is what the Vercel edge delivers.
 *
 * ## The budgets
 *
 * They live in `bunfig.toml` under `[size]`, next to the coverage floor,
 * because that is the file a reader looks for the project's limits in. The
 * values are in bytes.
 */

const REPO_ROOT = `${import.meta.dir}/..`
const CHUNK_GLOB = '.next/static/chunks/**/*.js'
const ROUTE_MANIFEST_GLOB = '.next/server/app/**/page_client-reference-manifest.js'

interface Bunfig {
  size?: {
    budget?: number
    initialBudget?: number
  }
}

interface RouteManifest {
  clientModules?: Record<string, { chunks?: string[] }>
}

const format = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(unit === 0 ? 0 : 2)} ${units[unit]}`
}

/**
 * The chunks a route loads when it is first visited.
 *
 * Next writes one manifest per route, and the client modules it lists
 * include the ones from the layouts above it -- so the union of their
 * chunks is the set the browser is asked for on the first navigation.
 *
 * The manifest is a JavaScript file that assigns a JSON object, so it is
 * read by taking the JSON out of the assignment. A format change makes
 * this fail loudly rather than measure nothing, which is the only
 * acceptable way for a budget to break.
 */
const routeChunks = async (manifestPath: string): Promise<string[] | null> => {
  const source = await Bun.file(`${REPO_ROOT}/${manifestPath}`).text()
  // The route key can contain `]` -- a dynamic segment is `[/library]` --
  // so the match is greedy: it takes the last `]` before the assignment,
  // which is the one that closes the key.
  const match = source.match(/__RSC_MANIFEST\[.*\]\s*=\s*(\{.*\})\s*;?\s*$/s)
  if (!match) return null

  let manifest: RouteManifest
  try {
    manifest = JSON.parse(match[1]) as RouteManifest
  } catch {
    return null
  }

  const chunks = new Set<string>()
  for (const clientModule of Object.values(manifest.clientModules ?? {})) {
    for (const chunk of clientModule.chunks ?? []) {
      chunks.add(chunk)
    }
  }
  return [...chunks]
}

/**
 * The route a manifest belongs to, in the form a reader recognises.
 */
const routeName = (manifestPath: string): string =>
  manifestPath
    .replace(/^\.next\/server\/app\//, '')
    .replace(/_client-reference-manifest\.js$/, '')
    .replace(/\/page$/, '')

interface RoutePayload {
  route: string
  bytes: number
  chunks: number
}

async function main(): Promise<void> {
  const bunfig = Bun.TOML.parse(await Bun.file(`${REPO_ROOT}/bunfig.toml`).text()) as Bunfig
  const budget = bunfig.size?.budget
  const initialBudget = bunfig.size?.initialBudget

  if (typeof budget !== 'number' || !Number.isFinite(budget) || budget <= 0) {
    console.error(
      '❌ No bundle budget configured.\n' +
        '   Add a [size] table to bunfig.toml with a `budget` in bytes, for example:\n\n' +
        '     [size]\n' +
        '     budget = 1572864\n'
    )
    process.exit(1)
  }

  const files: string[] = []
  for await (const file of new Bun.Glob(CHUNK_GLOB).scan({ cwd: REPO_ROOT, onlyFiles: true })) {
    files.push(file)
  }

  if (files.length === 0) {
    console.error(
      `❌ No client chunks found at ${CHUNK_GLOB}.\n` +
        '   The budget measures a production build. Run `bun run build` first.'
    )
    process.exit(1)
  }

  let raw = 0
  let compressed = 0
  const sizes = new Map<string, number>()

  for (const file of files) {
    const bytes = await Bun.file(`${REPO_ROOT}/${file}`).bytes()
    const gzipped = Bun.gzipSync(bytes, { level: 9 }).byteLength
    raw += bytes.byteLength
    compressed += gzipped
    sizes.set(file, gzipped)
  }

  // The initial payload of every route, from Next's own manifests.
  const routes: RoutePayload[] = []
  let unreadable = 0

  for await (const manifest of new Bun.Glob(ROUTE_MANIFEST_GLOB).scan({ cwd: REPO_ROOT, onlyFiles: true })) {
    const chunks = await routeChunks(manifest)
    if (chunks === null) {
      unreadable++
      continue
    }
    let bytes = 0
    for (const chunk of chunks) {
      // The manifests name chunks as `/_next/static/chunks/x.js`; the files
      // live under `.next/static/chunks/x.js`.
      const relative = chunk.replace(/^\/_next\//, '.next/')
      bytes += sizes.get(relative) ?? 0
    }
    routes.push({ route: routeName(manifest), bytes, chunks: chunks.length })
  }

  routes.sort((a, b) => b.bytes - a.bytes)
  const worst = routes[0]

  const headroom = budget - compressed
  const over = headroom < 0

  console.log('📦 Client bundle budget')
  console.log(`   chunks:    ${files.length} files, ${format(raw)} uncompressed`)
  console.log(`   gzip:      ${format(compressed)}`)
  console.log(`   budget:    ${format(budget)}`)
  console.log(`   headroom:  ${over ? `-${format(-headroom)}` : format(headroom)}`)

  if (worst) {
    const initialHeadroom = typeof initialBudget === 'number' ? initialBudget - worst.bytes : 0
    console.log('')
    console.log('📄 Initial payload (the chunks a route loads on first visit)')
    console.log(`   worst:     ${format(worst.bytes)} — ${worst.route} (${worst.chunks} chunks)`)
    if (typeof initialBudget === 'number') {
      console.log(`   budget:    ${format(initialBudget)}`)
      console.log(`   headroom:  ${initialHeadroom < 0 ? `-${format(-initialHeadroom)}` : format(initialHeadroom)}`)
    }
    if (routes.length > 1) {
      const median = routes[Math.floor(routes.length / 2)]
      console.log(`   median:    ${format(median.bytes)} — ${median.route}`)
    }
  }

  if (unreadable > 0) {
    console.error(
      `\n❌ ${unreadable} route manifest(s) could not be read.\n` +
        '   The initial-payload budget is measured from them, and a manifest it\n' +
        '   cannot read is a measurement it cannot make.'
    )
    process.exit(1)
  }

  if (over) {
    console.error(
      `\n❌ The client bundle is ${format(-headroom)} over budget.\n` +
        `   ${format(compressed)} compressed, budget ${format(budget)}.\n` +
        '   Either shrink the bundle or raise the budget in bunfig.toml under [size].'
    )
    process.exit(1)
  }

  if (typeof initialBudget === 'number' && worst && worst.bytes > initialBudget) {
    console.error(
      `\n❌ The initial payload is ${format(worst.bytes - initialBudget)} over budget.\n` +
        `   ${worst.route} loads ${format(worst.bytes)} on first visit, budget ${format(initialBudget)}.\n` +
        '   A library in the app shell is paid for by every visitor on every page:\n' +
        '   load it on demand instead, or raise the budget in bunfig.toml under [size].'
    )
    process.exit(1)
  }

  console.log('\n✅ Within budget.')
  process.exit(0)
}

main().catch((error: unknown) => {
  console.error('bundle budget check failed:', error)
  process.exit(1)
})

// A module, not a script: TypeScript gives every script file a shared global
// scope, so two of these declaring `main` would collide.
export {}
