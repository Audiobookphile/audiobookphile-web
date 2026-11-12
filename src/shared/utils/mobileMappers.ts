import type { MobileBookModel, MobileLibraryModel } from '@/types/schemas'
import { parseTitleAndAuthor, sanitizeDisplayTitle } from './titleAuthorParser'

// Safe date helper — handles null/undefined from Supabase rows
function toMs(value: string | null | undefined, fallback = 0): number {
  if (!value) return fallback
  const ms = new Date(value).getTime()
  return isNaN(ms) ? fallback : ms
}

export interface MobileProgressInput {
  id: string
  episode_id?: string | null
  duration?: number | null
  progress?: number | null
  current_time_pos?: number | null
  current_time?: number | null
  is_finished?: boolean | null
  hide_from_continue_listening?: boolean | null
  last_update?: string | null
  updated_at?: string | null
  started_at?: string | null
  created_at?: string | null
  finished_at?: string | null
}

export interface MobileAudioFileInput {
  id?: string
  ino?: string | number
  track_index?: number
  index?: number
  filename?: string
  duration?: number | string | null
  size?: number | string | null
  mime_type?: string | null
  mimeType?: string | null
  bit_rate?: number | string | null
  bitRate?: number | string | null
  codec?: string | null
  language?: string | null
  storage_path?: string | null
  path?: string | null
  rel_path?: string | null
  relPath?: string | null
  metadata?: Record<string, unknown> | null
}

export interface MobileChapterInput {
  id?: string | number
  title?: string
  start?: number
  start_time?: number
  end?: number
  end_time?: number
  chapter_index?: number
}

export interface MobileBookInput {
  id: string
  library_id?: string | null
  folder_id?: string | null
  path?: string | null
  rel_path?: string | null
  is_file?: boolean | null
  is_missing?: boolean | null
  is_invalid?: boolean | null
  media_type?: string | null
  cover_path?: string | null
  title?: string | null
  subtitle?: string | null
  added_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  mtime?: string | null
  ctime?: string | null
  birthtime?: string | null
  duration?: number | null
  size?: number | null
  author_names_first_last?: string | null
  book_authors?: Array<{
    authors?: {
      id?: string
      name?: string | null
      name_lf?: string | null
    } | null
  }> | null
  books?: {
    id?: string
    title?: string | null
    subtitle?: string | null
    description?: string | null
    published_year?: string | null
    published_date?: string | null
    publisher?: string | null
    isbn?: string | null
    asin?: string | null
    language?: string | null
    explicit?: boolean | null
    abridged?: boolean | null
    cover_path?: string | null
    tags?: unknown[] | null
    genres?: unknown[] | null
    narrators?: unknown[] | null
    audio_files?: MobileAudioFileInput[] | null
    chapters?: MobileChapterInput[] | null
    ebook_file?: unknown
    duration?: number | null
    size?: number | null
    book_authors?: Array<{
      authors?: { id: string; name: string; name_lf?: string } | null
    }> | null
    book_series?: Array<{
      series?: { id: string; name: string } | null
      sequence?: string | null
    }> | null
  } | null
}

export interface MobileLibraryInput {
  id: string
  name?: string | null
  display_order?: number | null
  icon?: string | null
  media_type?: string | null
  provider?: string | null
  created_at?: string | null
  updated_at?: string | null
  last_update?: string | null
  settings?: {
    coverAspectRatio?: number | null
    cover_aspect_ratio?: number | null
    disableWatcher?: boolean | null
    disable_watcher?: boolean | null
    skipMatchingMediaWithAsin?: boolean | null
    skip_matching_media_with_asin?: boolean | null
    skipMatchingMediaWithIsbn?: boolean | null
    skip_matching_media_with_isbn?: boolean | null
    autoScanCronExpression?: string | null
    auto_scan_cron_expression?: string | null
  } | null
  library_folders?: Array<{
    id: string
    library_id?: string | null
    path?: string | null
    created_at?: string | null
    added_at?: string | null
  }> | null
}

export function mapLibraryForMobile(lib: MobileLibraryInput): MobileLibraryModel {
  // NOTE: This function produces dual snake_case + camelCase output for mobile
  // client compatibility. The return is cast to MobileLibraryModel since the Zod
  // schema only validates the camelCase subset. All fields are present at runtime.
  //
  // ⚠️  SYNC WARNING: This mapper duplicates logic from
  //   audiobookphile-backend/supabase/functions/api/mappers.ts → mapLibraryForMobile
  // If you change field mappings here, apply the same change in the backend copy.
  return _mapLibraryForMobile(lib) as MobileLibraryModel
}

function _mapLibraryForMobile(lib: MobileLibraryInput): Record<string, unknown> {
  return {
    id: lib.id,
    name: lib.name || 'Library',
    display_order: lib.display_order ?? 0,
    displayOrder: lib.display_order ?? 0,
    icon: lib.icon || 'bookshelf',
    media_type: lib.media_type || 'book',
    mediaType: lib.media_type || 'book',
    provider: lib.provider || 'local',
    settings: {
      cover_aspect_ratio: lib.settings?.coverAspectRatio ?? lib.settings?.cover_aspect_ratio ?? 1,
      coverAspectRatio: lib.settings?.coverAspectRatio ?? lib.settings?.cover_aspect_ratio ?? 1,
      disable_watcher: lib.settings?.disableWatcher ?? lib.settings?.disable_watcher ?? false,
      disableWatcher: lib.settings?.disableWatcher ?? lib.settings?.disable_watcher ?? false,
      skip_matching_media_with_asin:
        lib.settings?.skipMatchingMediaWithAsin ?? lib.settings?.skip_matching_media_with_asin ?? false,
      skipMatchingMediaWithAsin:
        lib.settings?.skipMatchingMediaWithAsin ?? lib.settings?.skip_matching_media_with_asin ?? false,
      skip_matching_media_with_isbn:
        lib.settings?.skipMatchingMediaWithIsbn ?? lib.settings?.skip_matching_media_with_isbn ?? false,
      skipMatchingMediaWithIsbn:
        lib.settings?.skipMatchingMediaWithIsbn ?? lib.settings?.skip_matching_media_with_isbn ?? false,
      auto_scan_cron_expression:
        lib.settings?.autoScanCronExpression ?? lib.settings?.auto_scan_cron_expression ?? null,
      autoScanCronExpression: lib.settings?.autoScanCronExpression ?? lib.settings?.auto_scan_cron_expression ?? null,
    },
    folders:
      lib.library_folders?.map((f) => ({
        id: f.id,
        full_path: f.path || '',
        fullPath: f.path || '',
        library_id: f.library_id,
        libraryId: f.library_id,
        added_at: toMs(f.created_at || f.added_at),
        addedAt: toMs(f.created_at || f.added_at),
      })) || [],
    created_at: toMs(lib.created_at),
    createdAt: toMs(lib.created_at),
    last_update: toMs(lib.updated_at ?? lib.last_update ?? lib.created_at),
    lastUpdate: toMs(lib.updated_at ?? lib.last_update ?? lib.created_at),
  }
}

export function mapBookForMobile(item: MobileBookInput, progressRecord: MobileProgressInput | null): MobileBookModel {
  // NOTE: This function produces dual snake_case + camelCase output for mobile
  // client compatibility. The return is cast to MobileBookModel since the Zod
  // schema only validates the camelCase subset. All fields are present at runtime.
  //
  // ⚠️  SYNC WARNING: This mapper duplicates logic from
  //   audiobookphile-backend/supabase/functions/api/mappers.ts → mapBookForMobile
  // Key difference: the backend version includes duration estimation from file sizes
  // (96kbps fallback). If you add/change field mappings here, apply the same change
  // in the backend copy (and vice versa).
  //
  // The snake_case keys (library_id, is_file, etc.) are required by the iOS client.
  // Do not remove them without verifying the mobile client no longer reads them.

  return _mapBookForMobile(item, progressRecord) as MobileBookModel
}

function _mapBookForMobile(item: MobileBookInput, progressRecord: MobileProgressInput | null): Record<string, unknown> {
  // 1. Authors & Title
  const authors =
    item.book_authors?.map((ba) => ba.authors).filter((a): a is NonNullable<typeof a> => Boolean(a)) ||
    item.books?.book_authors?.map((ba) => ba.authors).filter((a): a is NonNullable<typeof a> => Boolean(a)) ||
    []
  const authorNames = authors.map((a) => a.name)
  const rawAuthorFallback =
    (item as unknown as { author_names_first_last?: string; author?: string }).author_names_first_last ||
    (item as unknown as { author_names_first_last?: string; author?: string }).author ||
    ''

  let finalTitle = item.books?.title || item.title || 'Unknown Title'
  let authorName = authorNames.join(', ') || rawAuthorFallback

  if (!authorName || authorName === 'Unknown Author') {
    const parsed = parseTitleAndAuthor(finalTitle)
    if (parsed.cleanAuthor && parsed.cleanAuthor !== 'Unknown Author') {
      authorName = parsed.cleanAuthor
      finalTitle = parsed.cleanTitle
    } else {
      authorName = 'Unknown Author'
    }
  }

  // Scraped titles carry redundant suffix tags ('[96] Unabridged', '(1517)')
  // that duplicate the separate subtitle/series/year metadata fields.
  finalTitle = sanitizeDisplayTitle(finalTitle)

  const authorNameLF = authors.map((a) => a.name_lf || a.name).join(', ') || authorName

  // 2. Narrators
  const narrators = item.books?.narrators || []
  const narratorName = Array.isArray(narrators) ? narrators.join(', ') : narrators || null

  // 3. Series
  const bookSeries = item.books?.book_series || []
  const seriesInfo = bookSeries[0]
  const seriesName = seriesInfo?.series?.name || null

  // 4. Audio Files
  const audioFilesList = item.books?.audio_files || []
  const audioFiles =
    audioFilesList
      .map((af) => {
        const meta = (af.metadata as Record<string, unknown>) || {}
        const metaFilename = typeof meta.filename === 'string' ? meta.filename : ''
        const filename = af.filename || metaFilename || ''
        const size = Number(af.size || meta.size) || 0
        const path = af.path || meta.path || af.storage_path || ''
        const relPath = af.relPath || af.rel_path || meta.relPath || meta.rel_path || af.storage_path || af.path || ''

        return {
          ino: af.id || af.ino,
          index: af.track_index !== undefined ? af.track_index : af.index !== undefined ? af.index : 0,
          filename: filename,
          duration: Number(af.duration) || 0,
          size: size,
          mime_type: af.mime_type || af.mimeType || 'audio/mpeg',
          mimeType: af.mime_type || af.mimeType || 'audio/mpeg',
          bit_rate: af.bit_rate || af.bitRate || null,
          bitRate: af.bit_rate || af.bitRate || null,
          codec: af.codec || null,
          language: af.language || null,
          metadata: {
            filename: filename,
            ext: filename.split('.').pop() || '',
            path: path,
            rel_path: relPath,
            relPath: relPath,
            size: size,
            mtime_ms: Number(meta.mtimeMs || meta.mtime_ms) || new Date().getTime(),
            mtimeMs: Number(meta.mtimeMs || meta.mtime_ms) || new Date().getTime(),
            ctime_ms: Number(meta.ctimeMs || meta.ctime_ms) || new Date().getTime(),
            ctimeMs: Number(meta.ctimeMs || meta.ctime_ms) || new Date().getTime(),
            birthtime_ms: Number(meta.birthtimeMs || meta.birthtime_ms) || new Date().getTime(),
            birthtimeMs: Number(meta.birthtimeMs || meta.birthtime_ms) || new Date().getTime(),
          },
        }
      })
      .sort((a, b) => a.index - b.index) || []

  // 5. Chapters
  const chaptersList = item.books?.chapters || []
  const chapters =
    chaptersList
      .map((ch) => ({
        id: ch.chapter_index !== undefined ? ch.chapter_index : ch.id,
        title: ch.title,
        start: Number(ch.start_time !== undefined ? ch.start_time : ch.start) || 0,
        end: Number(ch.end_time !== undefined ? ch.end_time : ch.end) || 0,
      }))
      .sort((a, b) => Number(a.id ?? 0) - Number(b.id ?? 0)) || []

  // 6. User Media Progress
  const userMediaProgress = progressRecord
    ? {
        id: progressRecord.id,
        library_item_id: item.id,
        libraryItemId: item.id,
        episode_id: progressRecord.episode_id || null,
        episodeId: progressRecord.episode_id || null,
        duration: Number(progressRecord.duration) || Number(item.books?.duration || item.duration) || 0,
        progress: Number(progressRecord.progress) || 0,
        current_time: Number(progressRecord.current_time_pos) || Number(progressRecord.current_time) || 0,
        currentTime: Number(progressRecord.current_time_pos) || Number(progressRecord.current_time) || 0,
        is_finished: progressRecord.is_finished || false,
        isFinished: progressRecord.is_finished || false,
        hide_from_continue_listening: progressRecord.hide_from_continue_listening ?? false,
        hideFromContinueListening: progressRecord.hide_from_continue_listening ?? false,
        last_update: toMs(progressRecord.last_update ?? progressRecord.updated_at),
        lastUpdate: toMs(progressRecord.last_update ?? progressRecord.updated_at),
        started_at: toMs(progressRecord.started_at ?? progressRecord.created_at ?? progressRecord.last_update),
        startedAt: toMs(progressRecord.started_at ?? progressRecord.created_at ?? progressRecord.last_update),
        finished_at: progressRecord.is_finished ? toMs(progressRecord.finished_at ?? progressRecord.last_update) : null,
        finishedAt: progressRecord.is_finished ? toMs(progressRecord.finished_at ?? progressRecord.last_update) : null,
      }
    : null

  return {
    id: item.id,
    ino: item.id,
    library_id: item.library_id,
    libraryId: item.library_id,
    folder_id: item.folder_id || 'default',
    folderId: item.folder_id || 'default',
    path: item.path || '',
    rel_path: item.rel_path || item.path || '',
    relPath: item.rel_path || item.path || '',
    is_file: item.is_file ?? false,
    isFile: item.is_file ?? false,
    mtime_ms: toMs(item.updated_at ?? item.mtime),
    mtimeMs: toMs(item.updated_at ?? item.mtime),
    ctime_ms: toMs(item.created_at ?? item.ctime),
    ctimeMs: toMs(item.created_at ?? item.ctime),
    birthtime_ms: toMs(item.created_at ?? item.birthtime),
    birthtimeMs: toMs(item.created_at ?? item.birthtime),
    added_at: toMs(item.added_at ?? item.created_at),
    addedAt: toMs(item.added_at ?? item.created_at),
    updated_at: toMs(item.updated_at),
    updatedAt: toMs(item.updated_at),
    is_missing: item.is_missing ?? false,
    isMissing: item.is_missing ?? false,
    is_invalid: item.is_invalid ?? false,
    isInvalid: item.is_invalid ?? false,
    media_type: item.media_type || 'book',
    mediaType: item.media_type || 'book',
    media: {
      mediaType: 'book' as const,
      library_files: audioFiles.map((af: { ino?: unknown; metadata?: unknown }) => ({
        ino: af.ino,
        metadata: af.metadata,
        is_supplementary: false,
        isSupplementary: false,
        file_type: 'audio',
        fileType: 'audio',
      })),
      chapters: chapters,
      duration: Number(item.books?.duration || item.duration) || 0,
      size: Number(item.books?.size || item.size) || 0,
      cover_path: item.cover_path || item.books?.cover_path || null,
      coverPath: item.cover_path || item.books?.cover_path || null,
      tags: item.books?.tags || [],
      audio_files: audioFiles,
      audioFiles: audioFiles,
      ebook_file: item.books?.ebook_file || null,
      ebookFile: item.books?.ebook_file || null,
      metadata: {
        title: finalTitle,
        subtitle: item.books?.subtitle || item.subtitle || null,
        author_name: authorName,
        authorName: authorName,
        author_name_lf: authorNameLF,
        authorNameLF: authorNameLF,
        narrator_name: narratorName,
        narratorName: narratorName,
        series_name: seriesName,
        seriesName: seriesName,
        genres: item.books?.genres || [],
        published_year: item.books?.published_year || null,
        publishedYear: item.books?.published_year || null,
        published_date: item.books?.published_date || null,
        publishedDate: item.books?.published_date || null,
        publisher: item.books?.publisher || null,
        description: item.books?.description || null,
        isbn: item.books?.isbn || null,
        asin: item.books?.asin || null,
        language: item.books?.language || null,
        explicit: item.books?.explicit || false,
        abridged: item.books?.abridged || false,
      },
    },
    user_media_progress: userMediaProgress,
    userMediaProgress: userMediaProgress,
  }
}
