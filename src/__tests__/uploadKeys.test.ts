import { describe, expect, it } from 'bun:test'
import { isProbableAudio, probeAudioDuration, probeItemDurations } from '../app/(main)/upload/uploadDurationProbe'
import { buildStorageKey, commonDirPrefix, dirName, sanitizeRelPath } from '../app/(main)/upload/uploadKeys'

describe('uploadKeys > dirName', () => {
  it('returns the directory portion or empty string', () => {
    expect(dirName('a/b/c.mp3')).toBe('a/b')
    expect(dirName('c.mp3')).toBe('')
    expect(dirName(undefined)).toBe('')
  })
})

describe('uploadKeys > commonDirPrefix', () => {
  it('finds the shared item directory', () => {
    expect(commonDirPrefix(['C/Daniel Pratt/Book/Chapter 1.mp3', 'C/Daniel Pratt/Book/Chapter 2.mp3'])).toBe(
      'C/Daniel Pratt/Book'
    )
  })

  it('collapses to empty for flat selections', () => {
    expect(commonDirPrefix(['Chapter 1.mp3', 'Chapter 2.mp3'])).toBe('')
    expect(commonDirPrefix([])).toBe('')
  })

  it('stops at the first divergence', () => {
    expect(commonDirPrefix(['Book/Disc 1/T01.mp3', 'Book/Disc 2/T01.mp3'])).toBe('Book')
  })
})

describe('uploadKeys > buildStorageKey', () => {
  it('keeps Dark Psychology sub-books precisely addressable', () => {
    const prefix = 'Collection/Daniel Pratt/Book'
    expect(buildStorageKey('book1', `${prefix}/Chapter 1.mp3`, 'Chapter 1.mp3', prefix)).toBe('book1/Chapter 1.mp3')
  })

  it('keeps multi-disc tracks distinct', () => {
    const prefix = 'Collection/Book'
    expect(buildStorageKey('book1', `${prefix}/Disc 1/Track 01.mp3`, 'Track 01.mp3', prefix)).toBe(
      'book1/Disc 1/Track 01.mp3'
    )
    expect(buildStorageKey('book1', `${prefix}/Disc 2/Track 01.mp3`, 'Track 01.mp3', prefix)).toBe(
      'book1/Disc 2/Track 01.mp3'
    )
  })

  it('matches legacy flat keys for flat selections', () => {
    expect(buildStorageKey('book1', 'Chapter 01.mp3', 'Chapter 01.mp3', '')).toBe('book1/Chapter 01.mp3')
    expect(buildStorageKey('book1', undefined, 'Chapter 01.mp3', '')).toBe('book1/Chapter 01.mp3')
  })

  it('sanitizes hostile segments without dropping the file', () => {
    expect(buildStorageKey('book1', 'A/../../evil.mp3', 'evil.mp3', '')).toBe('book1/A/evil.mp3')
  })
})

describe('uploadKeys > sanitizeRelPath', () => {
  it('sanitizes per segment and preserves separators', () => {
    expect(sanitizeRelPath('Disc 1/Track: 01.mp3')).toBe('Disc 1/Track - 01.mp3')
  })
})

describe('uploadDurationProbe > isProbableAudio', () => {
  it('detects audio by mime or extension', () => {
    expect(isProbableAudio('x.mp3', 'audio/mpeg')).toBe(true)
    expect(isProbableAudio('x.mp3')).toBe(true)
    expect(isProbableAudio('x.pdf', 'application/pdf')).toBe(false)
  })
})

describe('uploadDurationProbe > probeAudioDuration', () => {
  it('resolves undefined without a DOM Audio implementation', async () => {
    expect(typeof Audio).toBe('undefined')
    const blob = new Blob(['x'], { type: 'audio/mpeg' })
    await expect(probeAudioDuration(blob, 50)).resolves.toBeUndefined()
  })
})

describe('uploadDurationProbe > probeItemDurations', () => {
  it('maps probed durations and skips the rest without rejecting', async () => {
    const files = [
      { name: 'a.mp3', type: 'audio/mpeg' },
      { name: 'b.mp3', type: 'audio/mpeg' },
      { name: 'notes.pdf', type: 'application/pdf' },
    ]
    const result = await probeItemDurations(files, {
      concurrency: 2,
      probe: async (f) => (f.name === 'a.mp3' ? 61.5 : undefined),
    })
    expect(result.size).toBe(1)
    expect(result.get(files[0])).toBe(61.5)
  })

  it('never rejects when the probe throws', async () => {
    const files = [{ name: 'a.mp3', type: 'audio/mpeg' }]
    const result = await probeItemDurations(files, {
      probe: async () => {
        throw new Error('boom')
      },
    })
    expect(result.size).toBe(0)
  })
})
