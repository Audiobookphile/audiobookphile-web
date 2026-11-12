import { describe, expect, test } from 'bun:test'
import { getLibrarySlug, resolveLibraryFromParam, slugifyLibraryName } from '../shared/lib/library-slugs'

describe('library-slugs', () => {
  const mockLibraries = [
    { id: '207ad239-f42e-40dd-b9b2-d71054cb36f0', name: 'Audiobooks' },
    { id: '891cd421-1234-4567-8901-abcdef123456', name: 'Podcasts' },
    { id: '11111111-2222-3333-4444-555555555555', name: 'Sci-Fi & Fantasy' },
    { id: '22222222-3333-4444-5555-666666666666', name: 'Audiobooks' }, // duplicate name for collision test
  ]

  describe('slugifyLibraryName', () => {
    test('converts basic ASCII names to slugs', () => {
      expect(slugifyLibraryName('Audiobooks')).toBe('audiobooks')
      expect(slugifyLibraryName('Sci-Fi & Fantasy')).toBe('sci-fi-fantasy')
      expect(slugifyLibraryName('  My   Library 123  ')).toBe('my-library-123')
    })

    test('strips accents and symbols', () => {
      expect(slugifyLibraryName('Café Livres')).toBe('cafe-livres')
    })

    test('falls back to library-<id> when slug is empty', () => {
      expect(slugifyLibraryName('📚', '207ad239-f42e-40dd-b9b2-d71054cb36f0')).toBe('library-207ad239')
      expect(slugifyLibraryName('   ', '12345678')).toBe('library-12345678')
    })
  })

  describe('getLibrarySlug', () => {
    test('returns clean slug when no collision occurs', () => {
      expect(getLibrarySlug(mockLibraries[1], mockLibraries)).toBe('podcasts')
      expect(getLibrarySlug(mockLibraries[2], mockLibraries)).toBe('sci-fi-fantasy')
    })

    test('appends 4-character ID prefix when slug collision occurs', () => {
      expect(getLibrarySlug(mockLibraries[0], mockLibraries)).toBe('audiobooks-207a')
      expect(getLibrarySlug(mockLibraries[3], mockLibraries)).toBe('audiobooks-2222')
    })
  })

  describe('resolveLibraryFromParam', () => {
    test('resolves by slug and indicates not a UUID redirect', () => {
      const result = resolveLibraryFromParam('podcasts', mockLibraries)
      expect(result).toBeDefined()
      expect(result?.library.id).toBe('891cd421-1234-4567-8901-abcdef123456')
      expect(result?.isUuidRedirect).toBe(false)
    })

    test('resolves by collision-disambiguated slug and indicates not a UUID redirect', () => {
      const result = resolveLibraryFromParam('audiobooks-207a', mockLibraries)
      expect(result).toBeDefined()
      expect(result?.library.id).toBe('207ad239-f42e-40dd-b9b2-d71054cb36f0')
      expect(result?.isUuidRedirect).toBe(false)
    })

    test('resolves by raw UUID and indicates it should be redirected to slug', () => {
      const result = resolveLibraryFromParam('891cd421-1234-4567-8901-abcdef123456', mockLibraries)
      expect(result).toBeDefined()
      expect(result?.library.name).toBe('Podcasts')
      expect(result?.isUuidRedirect).toBe(true)
    })

    test('returns undefined for unknown param', () => {
      expect(resolveLibraryFromParam('unknown-library', mockLibraries)).toBeUndefined()
    })
  })
})
