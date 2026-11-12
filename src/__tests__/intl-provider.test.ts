import { describe, expect, it } from 'bun:test'
import { TIME_ZONE } from '../shared/lib/timeZone'

/**
 * Every NextIntlClientProvider in the app must be given a time zone.
 *
 * Without one, next-intl warns on the server on *every* render that uses a
 * translation -- which is every page -- and the warning is next-intl saying
 * that the server render and the browser render may disagree, which React
 * then reports as a hydration mismatch.
 *
 * The app had three providers and none of them passed one, so the warning
 * was on every page. This is a static check rather than a behavioural one
 * because the symptom is a warning in a dev server log, and a log nobody
 * reads is how it survived.
 */

const PROVIDER_DIR = `${import.meta.dir}/../shared/components`

const providerFiles = async (): Promise<string[]> => {
  const files: string[] = []
  for await (const file of new Bun.Glob('Locale*Provider.tsx').scan({ cwd: PROVIDER_DIR, onlyFiles: true })) {
    files.push(file)
  }
  return files.sort()
}

describe('intl providers', () => {
  it('finds the providers it is guarding', async () => {
    const files = await providerFiles()
    expect(files.length).toBeGreaterThan(0)
  })

  it('gives every NextIntlClientProvider a time zone', async () => {
    const files = await providerFiles()
    const offenders: string[] = []

    for (const file of files) {
      const source = await Bun.file(`${PROVIDER_DIR}/${file}`).text()
      for (const match of source.matchAll(/<NextIntlClientProvider[\s\S]*?>/g)) {
        if (!/\btimeZone=/.test(match[0])) {
          offenders.push(`${file}: ${match[0].replace(/\s+/g, ' ')}`)
        }
      }
    }

    expect(offenders).toEqual([])
  })

  it('uses a fixed zone, so the server render and the browser render agree', () => {
    // A zone derived from the machine or the browser would differ between
    // the two renders, which is the mismatch the warning is about.
    expect(TIME_ZONE).toBe('UTC')
  })
})
