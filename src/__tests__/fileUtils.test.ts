import { describe, expect, it } from 'bun:test'
import { SupportedFileTypes, sanitizeFileName } from '../shared/lib/fileUtils'

describe('fileUtils > sanitizeFileName', () => {
  it('returns empty string for non-string inputs', () => {
    // @ts-expect-error test invalid inputs
    expect(sanitizeFileName(null)).toBe('')
    // @ts-expect-error test invalid inputs
    expect(sanitizeFileName(undefined)).toBe('')
    // @ts-expect-error test invalid inputs
    expect(sanitizeFileName(123)).toBe('')
  })

  it('replaces colons with default colonReplacement " - "', () => {
    expect(sanitizeFileName('Sapiens: A Brief History.mp3')).toBe('Sapiens - A Brief History.mp3')
  })

  it('supports custom colon replacement', () => {
    expect(sanitizeFileName('Part:One.m4b', '_')).toBe('Part_One.m4b')
  })

  it('strips illegal filename characters', () => {
    expect(sanitizeFileName('Book<Title>?*"Name"|Test/Slash\\Back.mp3')).toBe('BookTitleNameTestSlashBack.mp3')
  })

  it('replaces consecutive spaces with a single space', () => {
    expect(sanitizeFileName('Chapter   01    Introduction.m4a')).toBe('Chapter 01 Introduction.m4a')
  })

  it('handles filenames without extensions', () => {
    expect(sanitizeFileName('JustATitle')).toBe('JustATitle')
  })

  it('handles dotfiles correctly', () => {
    expect(sanitizeFileName('.cover_preview')).toBe('.cover_preview')
  })

  it('truncates basename when total filename exceeds 255 bytes while preserving extension', () => {
    const longName = 'A'.repeat(300) + '.mp3'
    const sanitized = sanitizeFileName(longName)
    expect(sanitized.endsWith('.mp3')).toBe(true)
    const byteLength = new Blob([sanitized]).size
    expect(byteLength).toBeLessThanOrEqual(255)
  })
})

describe('fileUtils > SupportedFileTypes', () => {
  it('includes standard audio formats', () => {
    expect(SupportedFileTypes.audio).toContain('m4b')
    expect(SupportedFileTypes.audio).toContain('mp3')
    expect(SupportedFileTypes.audio).toContain('flac')
    expect(SupportedFileTypes.audio).toContain('opus')
  })

  it('includes standard image formats', () => {
    expect(SupportedFileTypes.image).toContain('jpg')
    expect(SupportedFileTypes.image).toContain('jpeg')
    expect(SupportedFileTypes.image).toContain('png')
    expect(SupportedFileTypes.image).toContain('webp')
  })
})
