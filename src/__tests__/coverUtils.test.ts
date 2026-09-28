import { describe, expect, it } from 'bun:test'
import { getLibraryItemCoverSrc, getLibraryItemCoverUrl, withCoverRetry } from '../shared/lib/coverUtils'

describe('getLibraryItemCoverUrl', () => {
  it('uses the provided updatedAt as a stable cache-buster', () => {
    const a = getLibraryItemCoverUrl('item-1', 1_700_000_000_000)
    const b = getLibraryItemCoverUrl('item-1', 1_700_000_000_000)
    expect(a).toBe(b)
    expect(a).toContain('ts=1700000000000')
  })

  it('produces a stable URL when updatedAt is missing instead of Date.now()', () => {
    // Regression: the fallback used Date.now(), so every call returned a new
    // URL. MediaCardCover resets imageReady whenever the src changes, which
    // left covers permanently on the loading placeholder.
    const a = getLibraryItemCoverUrl('item-1', undefined)
    const b = getLibraryItemCoverUrl('item-1', null)
    const c = getLibraryItemCoverUrl('item-1', 0)
    expect(a).toBe(b)
    expect(b).toBe(c)
    expect(a).toContain('ts=0')
  })

  it('changes the URL when updatedAt changes so a refreshed cover busts the cache', () => {
    const before = getLibraryItemCoverUrl('item-1', 1_700_000_000_000)
    const after = getLibraryItemCoverUrl('item-1', 1_800_000_000_000)
    expect(before).not.toBe(after)
  })

  it('never sends a raw flag the API does not declare', () => {
    // The endpoint 302-redirects to the stored object and does no processing,
    // so `raw=1` implied a variant that does not exist and was silently
    // dropped by the API's query schema.
    const src = getLibraryItemCoverUrl('item-1', 42)
    expect(src).not.toContain('raw')
  })
})

describe('withCoverRetry', () => {
  it('leaves the URL alone on the first attempt', () => {
    const src = 'https://api.test/items/item-1/cover?ts=1'
    expect(withCoverRetry(src, 0)).toBe(src)
  })

  it('appends a cache-buster so the request is genuinely re-issued', () => {
    const src = 'https://api.test/items/item-1/cover?ts=1'
    expect(withCoverRetry(src, 1)).toBe(`${src}&cb=1`)
    expect(withCoverRetry(src, 2)).not.toBe(withCoverRetry(src, 1))
  })

  it('uses ? when the URL has no query string', () => {
    expect(withCoverRetry('https://api.test/items/item-1/cover', 1)).toBe('https://api.test/items/item-1/cover?cb=1')
  })

  it('does NOT send force=1, which would re-query providers and can persist the missing sentinel', () => {
    const retried = withCoverRetry('https://api.test/items/item-1/cover?ts=1', 2)
    expect(retried).not.toContain('force')
  })

  it('is inert for an empty source', () => {
    expect(withCoverRetry('', 3)).toBe('')
  })
})

describe('getLibraryItemCoverSrc', () => {
  it('is stable across calls for the same item', () => {
    const item = { id: 'item-7' }
    const one = getLibraryItemCoverSrc(item, '/images/ph.jpg')
    const two = getLibraryItemCoverSrc(item, '/images/ph.jpg')
    expect(one).toBe(two)
  })

  it('routes through the api cover endpoint', () => {
    const src = getLibraryItemCoverSrc({ id: 'item-9', updatedAt: 42 }, '/images/ph.jpg')
    expect(src).toContain('/items/item-9/cover')
    expect(src).toContain('ts=42')
  })

  it('renders the placeholder for the terminal "missing" sentinel instead of hitting the cover api', () => {
    // Regression: cover_path='missing' is a terminal verdict, and the API
    // answers it with a JSON 404 that the browser blocks with
    // net::ERR_BLOCKED_BY_ORB. Rendering the placeholder directly avoids both
    // the console error and a request that can never succeed.
    const src = getLibraryItemCoverSrc({ id: 'item-10', updatedAt: 7, coverPath: 'missing' }, '/images/ph.jpg')
    expect(src).toBe('/images/ph.jpg')
  })

  it('detects the sentinel on a real payload, where coverPath is nested under media', () => {
    // The shape that actually ships. `LibraryItem` has no top-level
    // coverPath, so a top-level-only read made this resolve to undefined for
    // every real item and the sentinel short-circuit above never ran. A test
    // that hand-built `{ coverPath: 'missing' }` passed while the product
    // still requested a guaranteed 404.
    const fromMedia = getLibraryItemCoverSrc(
      { id: 'item-11', updatedAt: 9, media: { coverPath: 'missing' } },
      '/images/ph.jpg'
    )
    expect(fromMedia).toBe('/images/ph.jpg')

    const realFromMedia = getLibraryItemCoverSrc(
      { id: 'item-11', updatedAt: 9, media: { coverPath: 'item-11/cover.jpg' } },
      '/images/ph.jpg'
    )
    expect(realFromMedia).toContain('/items/item-11/cover')
  })

  it('still uses the api for a real cover path, an unknown path, or no path at all', () => {
    for (const coverPath of ['item-10/cover.jpg', null, undefined]) {
      const src = getLibraryItemCoverSrc({ id: 'item-10', updatedAt: 7, coverPath }, '/images/ph.jpg')
      expect(src).toContain('/items/item-10/cover')
    }
  })
})
