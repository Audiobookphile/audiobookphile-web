import { describe, expect, it } from 'bun:test'

describe('Timestamped Share URL Logic', () => {
  function buildShareUrl(origin: string, slug: string, timestamp?: number): string {
    const base = `${origin}/share/${slug}`
    if (timestamp != null && timestamp > 0) {
      return `${base}?t=${Math.floor(timestamp)}`
    }
    return base
  }

  function parseShareStartTime(queryParam?: string | null): number | undefined {
    if (!queryParam) return undefined
    const parsed = Number(queryParam)
    return !Number.isNaN(parsed) && parsed >= 0 ? parsed : undefined
  }

  it('builds clean share URL when no timestamp is included', () => {
    const url = buildShareUrl('https://audiobookphile.app', 'great-gatsby')
    expect(url).toBe('https://audiobookphile.app/share/great-gatsby')
  })

  it('appends integer second offset when positive timestamp is provided', () => {
    const url = buildShareUrl('https://audiobookphile.app', 'great-gatsby', 3625.8)
    expect(url).toBe('https://audiobookphile.app/share/great-gatsby?t=3625')
  })

  it('ignores zero or negative timestamps', () => {
    expect(buildShareUrl('https://audiobookphile.app', 'great-gatsby', 0)).toBe(
      'https://audiobookphile.app/share/great-gatsby'
    )
    expect(buildShareUrl('https://audiobookphile.app', 'great-gatsby', -15)).toBe(
      'https://audiobookphile.app/share/great-gatsby'
    )
  })

  it('parses valid start time query param correctly', () => {
    expect(parseShareStartTime('3625')).toBe(3625)
    expect(parseShareStartTime('0')).toBe(0)
    expect(parseShareStartTime(null)).toBeUndefined()
    expect(parseShareStartTime('invalid')).toBeUndefined()
    expect(parseShareStartTime('-10')).toBeUndefined()
  })
})
