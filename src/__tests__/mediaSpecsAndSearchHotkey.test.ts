import { describe, expect, it } from 'bun:test'
import type { AudioFile, BookLibraryItem } from '@/types/api'

describe('Audio & Media Specs formatting', () => {
  const sampleAudioFile: AudioFile = {
    index: 0,
    ino: 'ino-1',
    metadata: {
      filename: 'chapter1.m4b',
      ext: 'm4b',
      path: '/media/chapter1.m4b',
      relPath: 'chapter1.m4b',
      size: 52428800,
      mtimeMs: 0,
      ctimeMs: 0,
      birthtimeMs: 0,
    },
    addedAt: 0,
    updatedAt: 0,
    duration: 3600,
    bitRate: 128000,
    codec: 'aac',
    timeBase: '1/1000',
    channels: 2,
    channelLayout: 'stereo',
    chapters: [],
    metaTags: {},
    mimeType: 'audio/mp4',
  }

  const sampleBookItem: BookLibraryItem = {
    id: 'item-1',
    ino: 'ino-item-1',
    libraryId: 'lib-1',
    folderId: 'folder-1',
    path: '/media/book1',
    relPath: 'book1',
    isFile: false,
    mtimeMs: 0,
    ctimeMs: 0,
    birthtimeMs: 0,
    addedAt: 0,
    updatedAt: 0,
    isMissing: false,
    isInvalid: false,
    mediaType: 'book',
    media: {
      mediaType: 'book',
      metadata: {
        title: 'Project Hail Mary',
        authors: [{ id: 'a1', name: 'Andy Weir' }],
        narrators: ['Ray Porter'],
        series: [],
        genres: ['Sci-Fi'],
        publishedYear: '2021',
        explicit: false,
      },
      tags: [],
      audioFiles: [sampleAudioFile],
      duration: 57600,
      size: 524288000,
      numAudioFiles: 1,
    },
  }

  it('correctly extracts codec and formats in uppercase', () => {
    const audioFiles = sampleBookItem.media?.audioFiles
    expect(audioFiles).toBeDefined()
    expect(audioFiles?.[0]?.codec.toUpperCase()).toBe('AAC')
  })

  it('calculates bitrate in kbps correctly', () => {
    const bitRate = sampleBookItem.media?.audioFiles?.[0]?.bitRate
    expect(bitRate).toBe(128000)
    expect(`${Math.round(bitRate! / 1000)} kbps`).toBe('128 kbps')
  })

  it('determines channel layout description accurately', () => {
    const channels = sampleBookItem.media?.audioFiles?.[0]?.channels
    const channelLabel = channels === 2 ? 'Stereo (2 ch)' : channels === 1 ? 'Mono (1 ch)' : `${channels} ch`
    expect(channelLabel).toBe('Stereo (2 ch)')
  })

  it('extracts audio tracks count accurately', () => {
    const trackCount = sampleBookItem.media?.numAudioFiles || sampleBookItem.media?.audioFiles?.length || 0
    expect(trackCount).toBe(1)
  })
})
