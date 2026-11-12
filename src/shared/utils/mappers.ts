import {
  AudioFile,
  AudioTrack,
  BookMedia,
  Chapter,
  Library,
  LibraryItem,
  LibrarySettings,
  PodcastEpisode,
  PodcastMedia,
} from '@/types/api'
import type { Database } from '@/types/supabase'
import { parseTitleAndAuthor } from './titleAuthorParser'

// ─── Supabase Row type aliases (local to this module) ───────────────────────

type LibraryRow = Database['public']['Tables']['libraries']['Row'] & {
  library_folders?: Array<Database['public']['Tables']['library_folders']['Row']>
  folders?: Array<Database['public']['Tables']['library_folders']['Row']>
}

type PodcastEpisodesRow = Database['public']['Tables']['podcast_episodes']['Row']

/**
 * One entry of the `audio_files` JSON column.
 *
 * The column holds a JSON array of track records, and the mapper reads both
 * the record and its `metadata` object: the shape varies between the
 * scanners that wrote it, which is why `mimeType` and `mime_type` are both
 * read and why the metadata is the fallback for most of the fields.
 */
interface AudioFileRecord {
  index?: number
  ino?: string | number
  size?: number
  duration?: number
  timeBase?: string
  channels?: number
  channelLayout?: string
  chapters?: Chapter[]
  embeddedCoverArt?: string | null
  metaTags?: Record<string, unknown>
  mimeType?: string
  mime_type?: string
  codec?: string
  addedAt?: number
  updatedAt?: number
  bitRate?: number
  metadata?: Record<string, unknown>
}

/**
 * One entry of the `podcast_episodes` JSON column.
 *
 * The index signature is there because the record is spread into the
 * episode it becomes, so it carries fields the mapper does not read.
 */
interface PodcastEpisodeRecord {
  library_item_id?: string
  podcast_id?: string
  published_at?: string
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

type LibraryItemRow = Database['public']['Tables']['library_items']['Row'] & {
  book_authors?: Array<{
    authors: Database['public']['Tables']['authors']['Row'] | null
  }> | null
  book_series?: Array<{
    series: Database['public']['Tables']['series']['Row'] | null
    sequence: string | null
  }> | null
  podcast_episodes?: PodcastEpisodesRow[] | null
  // folder_id and scan_version are not in the DB schema but may be present from legacy/join paths
  folder_id?: string | null
  scan_version?: string | null
}

type LibrarySettingsJson = Database['public']['Tables']['libraries']['Row']['settings']

/**
 * Maps a raw Supabase library row (snake_case) to the canonical Library interface (camelCase).
 */
export function mapLibrary(row: LibraryRow): Library {
  if (!row) return row

  return {
    id: row.id,
    name: row.name || 'Library',
    mediaType: (row.media_type as 'book' | 'podcast') || 'book',
    displayOrder: row.display_order ?? 0,
    icon: row.icon || 'books',
    createdAt: row.created_at ? new Date(row.created_at).getTime() : 0,
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : 0,
    settings: mapLibrarySettings(row.settings),
    folders: (row.library_folders || row.folders || []).map((f) => ({
      id: f.id,
      libraryId: f.library_id ?? '',
      fullPath: f.path || '',
      updatedAt: f.updated_at ? new Date(f.updated_at).getTime() : 0,
    })),
  }
}

/**
 * Maps a raw Supabase library item row to the canonical LibraryItem interface.
 */
export function mapLibraryItem(row: LibraryItemRow): LibraryItem {
  if (!row) return row

  return {
    id: row.id,
    ino: row.ino ?? '',
    libraryId: row.library_id ?? '',
    folderId: row.folder_id ?? undefined,
    path: row.path ?? '',
    relPath: row.rel_path ?? '',
    isFile: row.is_file ?? false,
    isMissing: row.is_missing ?? false,
    isInvalid: row.is_invalid ?? false,
    mediaType: (row.media_type as 'book' | 'podcast') ?? 'book',
    mtimeMs: row.mtime ? new Date(row.mtime).getTime() : 0,
    ctimeMs: row.ctime ? new Date(row.ctime).getTime() : 0,
    birthtimeMs: row.birthtime ? new Date(row.birthtime).getTime() : 0,
    addedAt: row.created_at ? new Date(row.created_at).getTime() : 0,
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : 0,
    lastScan: row.last_scan ? new Date(row.last_scan).getTime() : undefined,
    scanVersion: row.scan_version ?? undefined,
    // Supabase returns a single object (not array) for FK joins via media_id → books.id (now merged)
    media:
      row.media_type === 'podcast' && row.podcast_episodes?.length ? mapPodcast(row.podcast_episodes[0]) : mapBook(row),
  }
}

function createSkeletonBook(row: Pick<LibraryItemRow, 'id' | 'title'>): BookMedia {
  return {
    mediaType: 'book',
    libraryItemId: row.id,
    tags: [],
    metadata: {
      title: row.title || 'Unknown',
      authors: [],
      narrators: [],
      series: [],
      genres: [],
      explicit: false,
      abridged: false,
    },
  }
}

const ALL_AUDIO_EXTENSIONS = [
  '.mp3',
  '.m4b',
  '.m4a',
  '.aac',
  '.flac',
  '.ogg',
  '.oga',
  '.ogv',
  '.opus',
  '.wav',
  '.webm',
  '.webma',
  '.wma',
  '.aiff',
  '.aif',
  '.caf',
  '.awb',
  '.mka',
  '.mkv',
  '.mp4',
  '.m4v',
]

function resolveAudioMimeAndCodec(extRaw: string, currentMime?: string, currentCodec?: string) {
  const ext = extRaw.toLowerCase().replace(/^\./, '')
  let mimeType = currentMime || ''
  if (!mimeType || mimeType === 'audio/mpeg' || mimeType === 'application/octet-stream') {
    switch (ext) {
      case 'm4b':
      case 'm4a':
      case 'mp4':
      case 'm4v':
        mimeType = 'audio/mp4'
        break
      case 'mp3':
      case 'mpeg':
      case 'mpg':
        mimeType = 'audio/mpeg'
        break
      case 'flac':
        mimeType = 'audio/flac'
        break
      case 'opus':
        mimeType = 'audio/opus'
        break
      case 'ogg':
      case 'oga':
      case 'ogv':
        mimeType = 'audio/ogg'
        break
      case 'aac':
        mimeType = 'audio/aac'
        break
      case 'wav':
        mimeType = 'audio/wav'
        break
      case 'webm':
      case 'webma':
        mimeType = 'audio/webm'
        break
      case 'wma':
      case 'wmv':
      case 'asf':
        mimeType = 'audio/x-ms-wma'
        break
      case 'aiff':
      case 'aif':
        mimeType = 'audio/aiff'
        break
      case 'caf':
        mimeType = 'audio/x-caf'
        break
      case 'awb':
      case '3gp':
        mimeType = 'audio/amr-wb'
        break
      case 'mka':
      case 'mkv':
        mimeType = 'audio/x-matroska'
        break
      default:
        mimeType = currentMime || 'audio/mpeg'
    }
  }

  let codec = currentCodec || ''
  if (!codec || codec === 'mp3') {
    switch (ext) {
      case 'm4b':
      case 'm4a':
      case 'mp4':
      case 'm4v':
      case 'aac':
        codec = 'aac'
        break
      case 'flac':
        codec = 'flac'
        break
      case 'opus':
        codec = 'opus'
        break
      case 'ogg':
      case 'oga':
      case 'ogv':
        codec = 'vorbis'
        break
      case 'wav':
      case 'aiff':
      case 'aif':
        codec = 'pcm'
        break
      case 'wma':
      case 'wmv':
      case 'asf':
        codec = 'wma'
        break
      case 'caf':
        codec = 'aac'
        break
      case 'awb':
      case '3gp':
        codec = 'amr-wb'
        break
      default:
        codec = currentCodec || 'mp3'
    }
  }

  return { mimeType, codec }
}

function mapBook(book: LibraryItemRow): BookMedia {
  if (!book) {
    return createSkeletonBook({} as Pick<LibraryItemRow, 'id' | 'title'>)
  }

  let audioFiles = (book.audio_files as AudioFileRecord[] | null) || []
  if (audioFiles.length === 0 && Array.isArray((book as Record<string, unknown>).library_files)) {
    const extracted = ((book as Record<string, unknown>).library_files as Record<string, unknown>[])
      .filter((lf) => {
        const metadata = (lf.metadata as Record<string, unknown>) || {}
        const ext = typeof metadata.ext === 'string' ? metadata.ext.toLowerCase() : ''
        const relPath = typeof metadata.relPath === 'string' ? metadata.relPath.toLowerCase() : ''
        const filename = typeof metadata.filename === 'string' ? metadata.filename.toLowerCase() : ''
        const path = typeof lf.path === 'string' ? lf.path.toLowerCase() : ''
        return ALL_AUDIO_EXTENSIONS.some(
          (e) => ext.endsWith(e) || relPath.endsWith(e) || filename.endsWith(e) || path.endsWith(e)
        )
      })
      .map((lf, idx) => {
        const metadata = (lf.metadata as Record<string, unknown>) || {}
        const ext = typeof metadata.ext === 'string' ? metadata.ext.toLowerCase() : ''
        const { mimeType, codec } = resolveAudioMimeAndCodec(ext, metadata.mimeType as string, metadata.codec as string)

        return {
          index: idx,
          ino: typeof lf.ino === 'string' || typeof lf.ino === 'number' ? lf.ino : undefined,
          metadata,
          size: Number(lf.size) || Number(metadata.size) || 0,
          duration: Number(lf.duration) || Number(metadata.duration) || 0,
          mimeType,
          codec,
        }
      })
    if (extracted.length > 0) {
      audioFiles = extracted
    }
  }

  // Map raw audio_files JSONB to AudioTrack shape for the tracks table
  const tracks = (Array.isArray(audioFiles) ? audioFiles : [])
    .map((af: AudioFileRecord, i: number) => {
      if (!af || typeof af !== 'object') return null
      const a = af
      const meta = a.metadata && typeof a.metadata === 'object' ? a.metadata : {}
      const ext = String(
        typeof meta.ext === 'string'
          ? meta.ext
          : typeof meta.filename === 'string'
            ? (meta.filename.split('.').pop() ?? '')
            : ''
      ).toLowerCase()
      const { mimeType, codec } = resolveAudioMimeAndCodec(
        ext,
        a.mimeType || a.mime_type || (meta?.mimeType as string),
        a.codec || (meta?.codec as string)
      )

      return {
        ...a,
        metadata: a.metadata || {
          filename: '',
          ext: '',
          path: '',
          relPath: '',
          size: 0,
          mtimeMs: 0,
          ctimeMs: 0,
          birthtimeMs: 0,
        },
        index: (a.index as number) ?? i,
        startOffset: 0,
        duration: (a.duration as number) ?? 0,
        title: (meta?.filename as string) ?? `Track ${i + 1}`,
        contentUrl: (meta?.path as string) ?? '',
        mimeType,
        codec,
        timeBase: (a.timeBase as string) ?? '1/1000',
        channels: (a.channels as number) ?? 2,
        channelLayout: (a.channelLayout as string) ?? 'stereo',
        chapters: a.chapters ?? [],
        embeddedCoverArt: (a.embeddedCoverArt as string | null) ?? null,
        metaTags: (a.metaTags as Record<string, unknown>) ?? {},
        isDirectPlaySupported: true,
        ino: (a.ino as string) ?? '',
        addedAt: (a.addedAt as number) ?? 0,
        updatedAt: (a.updatedAt as number) ?? 0,
        bitRate: (a.bitRate as number) ?? 0,
        // The record's metadata is the scanner's object, not the declared
        // `AudioFile['metadata']` shape, and the code has always trusted it
        // to be one. The `any` that used to carry this hid the assertion
        // from the compiler; `as unknown as` says it out loud, and the
        // fields the mapper reads are typed on the way in.
      } as unknown as AudioTrack
    })
    .filter(Boolean)

  let title = book.title || 'Unknown'
  let rawAuthors =
    book.book_authors && book.book_authors.length > 0
      ? book.book_authors
          .map((ba) => ba.authors?.name)
          .filter(Boolean)
          .join(', ')
      : book.author_names_first_last || ''

  if (!rawAuthors || rawAuthors === 'Unknown Author') {
    const parsed = parseTitleAndAuthor(title)
    if (parsed.cleanAuthor && parsed.cleanAuthor !== 'Unknown Author') {
      rawAuthors = parsed.cleanAuthor
      title = parsed.cleanTitle
    }
  }

  const authorsList = rawAuthors ? rawAuthors.split(', ').map((name: string) => ({ id: '', name })) : []

  return {
    mediaType: 'book' as const,
    id: book.id,
    libraryItemId: book.id,
    coverPath: book.cover_path ?? undefined,
    tags: (book.tags as string[]) || [],
    audioFiles: audioFiles as AudioFile[],
    // `tracks` was dropped here: it duplicated audioFiles, was never emitted by
    // the API, and every `media.tracks.length > 0` guard built on it silently
    // read undefined -- which is what hid Play on the item detail page.
    numTracks: tracks.length,
    numAudioFiles: audioFiles.length,
    chapters: (book.chapters as Chapter[] | null) || [],
    metadata: {
      title,
      subtitle: book.subtitle ?? undefined,
      authors: authorsList,
      narrators: (book.narrators as string[]) || [],
      series: (book.book_series || []).map((bs) => ({
        id: bs.series?.id ?? '',
        name: bs.series?.name || 'Unknown Series',
        sequence: bs.sequence ?? undefined,
      })),
      genres: Array.isArray(book.genres)
        ? (book.genres as string[])
        : typeof book.genres === 'string'
          ? JSON.parse(book.genres)
          : [],
      publishedYear: typeof book.published_year === 'number' ? book.published_year : undefined,
      publishedDate: book.published_date ?? undefined,
      publisher: book.publisher ?? undefined,
      description: book.description ?? undefined,
      isbn: book.isbn ?? undefined,
      asin: book.asin ?? undefined,
      language: book.language ?? undefined,
      explicit: !!book.explicit,
      abridged: !!book.abridged,
    },
  }
}

function mapPodcast(podcast: PodcastEpisodesRow): PodcastMedia {
  if (!podcast) {
    return {
      mediaType: 'podcast' as const,
      metadata: {
        title: 'Unknown Podcast',
        author: 'Unknown',
        description: '',
        genres: [],
        explicit: false,
      },
      tags: [],
    }
  }

  const p = podcast as PodcastEpisodesRow & Record<string, unknown>

  return {
    mediaType: 'podcast' as const,
    id: podcast.id,
    libraryItemId: p.library_item_id as string | undefined,
    coverPath: p.cover_path as string | undefined,
    tags: (p.tags as string[]) || [],
    episodes: ((p.podcast_episodes as PodcastEpisodeRecord[] | null) || [])
      .map((ep: PodcastEpisodeRecord) => {
        if (!ep || typeof ep !== 'object') return null
        const e = ep
        return {
          ...e,
          libraryItemId: e.library_item_id,
          podcastId: e.podcast_id,
          pubDate: e.published_at ? new Date(e.published_at).toISOString() : undefined,
          publishedAt: e.published_at ? new Date(e.published_at).getTime() : 0,
          addedAt: e.created_at ? new Date(e.created_at).getTime() : 0,
          updatedAt: e.updated_at ? new Date(e.updated_at).getTime() : 0,
        }
      })
      .filter(Boolean) as PodcastEpisode[],
    metadata: {
      title: (p.title as string) || 'Unknown',
      author: p.author as string | undefined,
      description: podcast.description ?? undefined,
      genres: (p.genres as string[]) || [],
      explicit: !!(p.explicit as boolean | null),
    },
    numEpisodes: p.num_episodes as number | undefined,
  }
}

/**
 * Maps raw library settings to the canonical LibrarySettings interface.
 */
export function mapLibrarySettings(settings: LibrarySettingsJson): LibrarySettings {
  if (!settings) {
    return {
      coverAspectRatio: 1,
      disableWatcher: false,
    }
  }

  // Supabase types Json as a deep recursive type; cast to a plain record for field access
  const s = settings as Record<string, unknown>

  return {
    coverAspectRatio: ((s.cover_aspect_ratio as number) ?? 1) as 0 | 1,
    disableWatcher: (s.disable_watcher as boolean) ?? false,
    skipMatchingMediaWithAsin: s.skip_matching_media_with_asin as boolean | undefined,
    skipMatchingMediaWithIsbn: s.skip_matching_media_with_isbn as boolean | undefined,
    autoScanCronExpression: s.auto_scan_cron_expression as string | undefined,
    audiobooksOnly: s.audiobooks_only as boolean | undefined,
    hideSingleBookSeries: s.hide_single_book_series as boolean | undefined,
    onlyShowLaterBooksInContinueSeries: s.only_show_later_books_in_continue_series as boolean | undefined,
    metadataPrecedence: s.metadata_precedence as string[] | undefined,
    markAsFinishedTimeRemaining: s.mark_as_finished_time_remaining as number | undefined,
    markAsFinishedPercentComplete: s.mark_as_finished_percent_complete as number | undefined,
    podcastSearchRegion: s.podcast_search_region as string | undefined,
  }
}
