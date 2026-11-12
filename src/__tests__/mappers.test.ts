import { describe, expect, it } from 'bun:test'
import { parseTitleAndAuthor } from '../shared/utils/titleAuthorParser'

describe('Title and Author Parser Unit Tests', () => {
  it('parses "Artist - Title" pattern correctly', () => {
    const res = parseTitleAndAuthor('Christopher Hitchens - Hitch-22')
    expect(res.cleanTitle).toBe('Hitch - 22')
    expect(res.cleanAuthor).toBe('Christopher Hitchens')
  })

  it('parses "Last, First -- Title" pattern correctly', () => {
    const res = parseTitleAndAuthor('Sagan, Carl -- The Demon-Haunted World')
    expect(res.cleanTitle).toBe('The Demon-Haunted World')
    expect(res.cleanAuthor).toBe('Carl Sagan')
  })
})
