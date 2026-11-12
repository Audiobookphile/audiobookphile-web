#!/usr/bin/env bun
/**
 * Sort the translation catalogues by key.
 *
 * This replaces `prettier-plugin-sort-json`. Sorting the catalogues keeps a
 * missing translation easy to spot: the same key sits in the same place in
 * every locale file, so a diff shows what changed rather than where
 * everything moved to.
 *
 * Only the top level is sorted, matching the plugin's default: nested objects
 * (there is exactly one, `ErrorBoundary`) keep the order the author wrote.
 */

const LOCALES_DIR = `${import.meta.dir}/../src/locales`

/**
 * JavaScript's default sort compares UTF-16 code units, which for these
 * ASCII keys is the same order as `LC_ALL=C sort`. Numbers inside a key are
 * therefore compared digit by digit ("Every12Hours" before "Every2Hours"),
 * which is what the files were sorted with before this script existed.
 */
const sortKeys = <T>(value: T): T => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return value
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return Object.fromEntries(entries) as T
}

async function main(): Promise<void> {
  const files: string[] = []
  for await (const file of new Bun.Glob('*.json').scan({ cwd: LOCALES_DIR, onlyFiles: true })) {
    files.push(file)
  }
  files.sort()

  if (files.length === 0) {
    console.log('⏭️  No locales directory — nothing to sort.')
    process.exit(0)
  }

  for (const file of files) {
    const path = `${LOCALES_DIR}/${file}`
    const original = await Bun.file(path).text()
    const sorted = `${JSON.stringify(sortKeys(JSON.parse(original)), null, 2)}\n`

    if (sorted === original) {
      console.log(`✅ ${file} — already sorted`)
      continue
    }
    await Bun.write(path, sorted)
    console.log(`🔀 ${file} — sorted`)
  }

  process.exit(0)
}

main().catch((error: unknown) => {
  console.error('sort-locales failed:', error)
  process.exit(1)
})
