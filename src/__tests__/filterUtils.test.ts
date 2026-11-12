import { describe, expect, test } from 'bun:test'
import { filterDecode, filterEncode } from '../shared/lib/filterUtils'

describe('filterUtils', () => {
  describe('filterEncode', () => {
    test('URL-encodes the base64 result', () => {
      // The value ends up in a query string, so the base64 is percent-encoded:
      // '=' becomes '%3D'. This is the wire format the API expects.
      expect(filterEncode('hello')).toBe('aGVsbG8%3D')
    })

    test('encodes an empty string', () => {
      expect(filterEncode('')).toBe('')
    })

    test('encodes multi-byte UTF-8 as UTF-8 bytes, not code points', () => {
      // "café" is 5 UTF-8 bytes (c, a, f, 0xC3, 0xA9). A code-point
      // implementation would produce a different base64 string, so this pins
      // the encoding to the byte-oriented behaviour the API expects.
      expect(filterEncode('café')).toBe('Y2Fmw6k%3D')
      expect(filterEncode('日本語')).toBe('5pel5pys6Kqe')
      expect(filterEncode('📚')).toBe('8J%2BTmg%3D%3D')
    })

    test('never leaves a base64 character unencoded in the query value', () => {
      // '+' and '/' are significant in a query string, so they must be
      // percent-encoded or the server reads a different value.
      const encoded = filterEncode('ûÿ')
      expect(encoded).toBe('w7vDvw%3D%3D')
      expect(encoded).not.toContain('+')
      expect(encoded).not.toContain('/')
    })
  })

  describe('filterDecode', () => {
    test('round-trips ASCII', () => {
      expect(filterDecode(filterEncode('hello'))).toBe('hello')
    })

    test('round-trips multi-byte UTF-8', () => {
      for (const value of ['café', '日本語', '📚 books', 'a+b/c', ' leading and trailing ']) {
        expect(filterDecode(filterEncode(value))).toBe(value)
      }
    })

    test('decodes a value produced by filterEncode', () => {
      expect(filterDecode('Y2Fmw6k%3D')).toBe('café')
    })
  })
})
