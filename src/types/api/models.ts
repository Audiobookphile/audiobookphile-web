import { AuthMethod } from './auth'
import { BookshelfView, LogLevel, PersonalizedShelfType, PlayMethod } from './enums'

export interface ServerStatus {
  serverVersion: string
  language: string
  isInit: boolean
  authMethods: string[]
  authFormData: Record<string, unknown>
  ConfigPath: string
  MetadataPath: string
  app: string
}

export interface ServerSettings {
  // Scanner settings
  scannerParseSubtitle: boolean
  scannerFindCovers: boolean
  scannerCoverProvider: string
  scannerPreferMatchedMetadata: boolean
  scannerDisableWatcher: boolean

  // Metadata settings
  storeCoverWithItem: boolean
  storeMetadataWithItem: boolean
  metadataFileFormat: string

  // Security/Rate limits
  rateLimitLoginRequests: number
  rateLimitLoginWindow: number // in milliseconds
  allowIframe: boolean

  // Backups
  backupPath: string
  backupSchedule: string | false // Cron expression or false if disabled
  backupsToKeep: number
  maxBackupSize: number // in GB

  // Logger
  loggerDailyLogsToKeep: number
  loggerScannerLogsToKeep: number

  // Bookshelf Display
  homeBookshelfView: BookshelfView
  bookshelfView: BookshelfView

  // Podcasts
  podcastEpisodeSchedule: string // Cron expression

  // Sorting
  sortingIgnorePrefix: boolean
  sortingPrefixes: string[]

  // Misc Flags
  chromecastEnabled: boolean
  dateFormat: string
  timeFormat: string
  language: string
  allowedOrigins: string[]

  // System info
  logLevel: LogLevel
  version: string
  buildNumber: string

  // Auth settings
  authLoginCustomMessage?: string
  authActiveAuthMethods: AuthMethod[]
  authOpenIDIssuerURL?: string
  authOpenIDAuthorizationURL?: string
  authOpenIDTokenURL?: string
  authOpenIDUserInfoURL?: string
  authOpenIDJwksURL?: string
  authOpenIDLogoutURL?: string
  authOpenIDTokenSigningAlgorithm: string
  authOpenIDButtonText: string
  authOpenIDAutoLaunch: boolean
  authOpenIDAutoRegister: boolean
  authOpenIDMatchExistingBy?: string
  authOpenIDSubfolderForRedirectURLs?: string
}

export interface FileMetadata {
  filename: string
  ext: string
  path: string
  relPath: string
  size: number
  mtimeMs: number
  ctimeMs: number
  birthtimeMs: number
}

export interface LibraryFile {
  ino: string
  metadata: FileMetadata
  isSupplementary?: boolean
  addedAt: number
  updatedAt: number
  fileType?: 'image' | 'audio' | 'ebook' | 'text' | 'metadata' | 'unknown'
}

export interface DirectoryEntry {
  path: string
  dirname: string
  level: number
}

export interface LibrarySettings {
  coverAspectRatio: 0 | 1
  disableWatcher: boolean
  skipMatchingMediaWithAsin?: boolean
  skipMatchingMediaWithIsbn?: boolean
  autoScanCronExpression?: string | null
  audiobooksOnly?: boolean
  hideSingleBookSeries?: boolean
  onlyShowLaterBooksInContinueSeries?: boolean
  metadataPrecedence?: string[]
  markAsFinishedTimeRemaining?: number | null
  markAsFinishedPercentComplete?: number | null
  podcastSearchRegion?: string
  epubsAllowScriptedContent?: boolean
}

export interface Library {
  id: string
  name: string
  displayOrder: number
  icon: string
  mediaType: 'book' | 'podcast'
  provider?: string
  lastScan?: number
  lastScanVersion?: string
  settings?: LibrarySettings
  createdAt: number
  updatedAt: number
  folders?: LibraryFolder[]
}

export interface LibraryStats {
  totalItems: number
  totalBooks: number
  totalAuthors: number
  totalSeries: number
  totalDuration: number
  totalSize: number
  addedLast30Days: number
  numAudioTracks: number
  genresWithCount: { genre: string; count: number }[]
  authorsWithCount: { id: string; name: string; count: number }[]
  longestItems: { id: string; title: string; duration: number }[]
  largestItems: { id: string; title: string; size: number }[]
}

export interface LibraryFolder {
  id: string
  fullPath: string
  libraryId: string
  updatedAt: number
}

export interface LibraryFilterData {
  authors: { id: string; name: string }[]
  genres: string[]
  tags: string[]
  series: { id: string; name: string }[]
  narrators: string[]
  publishers: string[]
  languages: string[]
  publishedDecades: string[]
}

export interface Author {
  id: string
  name: string
  description?: string
  imagePath?: string
  asin?: string
  libraryId?: string
  addedAt?: number
  updatedAt?: number
  numBooks?: number
  libraryItems?: LibraryItem[]
  series?: Series[]
}

export interface SeriesBook {
  id: string
  sequence: string
  title: string
  addedAt?: number
  updatedAt?: number
  media: {
    id: string
    coverPath: string | null
    duration?: number
  }
  cover: string | null
}

export interface Series {
  id: string
  name: string
  /** in series sequence */
  sequence?: string
  /** name with prefix moved to end (for sorting) */
  nameIgnorePrefix?: string
  description?: string
  coverPath?: string
  libraryId?: string
  addedAt?: number
  updatedAt?: number
  bookSeries?: {
    sequence: string
  }
  /** books in the series (expanded only) */
  books?: SeriesBook[] | LibraryItem[]
  /** if available (expanded only) */
  rssFeed?: RssFeed
  /** library items (author page endpoint only) */
  items?: LibraryItem[]
}

export interface CollapsedSeries {
  id: string
  name?: string
  nameIgnorePrefix?: string
  numBooks?: number
  seriesSequenceList?: string
}

export interface Collection {
  id: string
  name: string
  description?: string
  libraryId: string
  /** books in the collection (expanded only) */
  books?: LibraryItem[]
  /** if available (expanded only) */
  rssFeed?: RssFeed
  createdAt?: number
  updatedAt?: number
}

export interface PlaylistItem {
  libraryItemId: string
  libraryItem: LibraryItem
  episodeId?: string
  episode?: PodcastEpisode
}

export interface Playlist {
  id: string
  name: string
  description?: string
  libraryId: string
  userId: string
  /** items in the playlist (expanded only) */
  items?: PlaylistItem[]
  lastUpdate?: number
  createdAt?: number
}

export interface BookMetadata {
  title?: string
  subtitle?: string
  authors: Author[]
  narrators: string[]
  series: Series[]
  /** comma-separated */
  genres: string[]
  publishedYear?: string
  publishedDate?: string
  publisher?: string
  description?: string
  isbn?: string
  asin?: string
  language?: string
  explicit: boolean
  abridged?: boolean
  // Server-computed properties for display/sorting
  authorName?: string
  authorNameLF?: string
  titleIgnorePrefix?: string
  seriesName?: string
  author?: string
}

export interface PodcastMetadata {
  title?: string
  author?: string
  description?: string
  releaseDate?: string
  /** comma-separated */
  genres: string[]
  feedUrl?: string
  imageUrl?: string
  itunesPageUrl?: string
  itunesId?: string
  itunesArtistId?: string
  explicit: boolean
  language?: string
  type?: string
}

export interface AudioMetaTags {
  tagAlbum?: string
  tagAlbumSort?: string
  tagArtist?: string
  tagArtistSort?: string
  tagGenre?: string
  tagTitle?: string
  tagTitleSort?: string
  tagSeries?: string
  tagSeriesPart?: string
  tagGrouping?: string
  tagTrack?: string
  tagDisc?: string
  tagSubtitle?: string
  tagAlbumArtist?: string
  tagDate?: string
  tagComposer?: string
  tagPublisher?: string
  tagComment?: string
  tagDescription?: string
  tagEncoder?: string
  tagEncodedBy?: string
  tagIsbn?: string
  tagLanguage?: string
  tagASIN?: string
  tagItunesId?: string
  tagPodcastType?: string
  tagEpisodeType?: string
  tagOverdriveMediaMarker?: string
  tagOriginalYear?: string
  tagReleaseCountry?: string
  tagReleaseType?: string
  tagReleaseStatus?: string
  tagISRC?: string
  tagMusicBrainzTrackId?: string
  tagMusicBrainzAlbumId?: string
  tagMusicBrainzAlbumArtistId?: string
  tagMusicBrainzArtistId?: string
}

export interface AudioFile {
  index: number
  ino: string
  metadata: {
    filename: string
    ext: string
    path: string
    relPath: string
    /** in bytes */
    size: number
    mtimeMs: number
    ctimeMs: number
    birthtimeMs: number
  }
  addedAt: number
  updatedAt: number
  trackNumFromMeta?: number
  /** from filename */
  trackNumFromFilename?: number
  discNumFromMeta?: number
  /** from filename */
  discNumFromFilename?: number
  /** in seconds */
  duration: number
  bitRate: number
  language?: string
  codec: string
  timeBase: string
  channels: number
  channelLayout: string
  chapters: Chapter[]
  embeddedCoverArt?: string
  metaTags: Record<string, string>
  mimeType: string
}

export interface AudioTrack extends AudioFile {
  title: string
  contentUrl: string
  startOffset: number
}

export interface Chapter {
  id: number
  /** in seconds */
  start: number
  /** in seconds */
  end: number
  title: string
}

export interface EBookFile {
  ino: string
  metadata: {
    filename: string
    ext: string
    path: string
    relPath: string
    /** in bytes */
    size: number
    mtimeMs: number
    ctimeMs: number
    birthtimeMs: number
  }
  ebookFormat: string
  addedAt: number
  updatedAt: number
}

/**
 * Flat string representation of book metadata — used by the mobile/Zod path.
 * Authors, narrators, and series are pre-joined as strings, not arrays.
 * Matches `BookMetadataSchema` in `src/types/schemas.ts`.
 *
 * Compare with `BookMetadata`, which uses structured `Author[]`, `string[]`, `Series[]`
 * for the ABS/web path.
 */
export interface BookMetadataFlat {
  title: string
  subtitle?: string | null
  authorName?: string | null
  authorNameLF?: string | null
  narratorName?: string | null
  seriesName?: string | null
  genres: string[]
  publishedYear?: string | null
  publishedDate?: string | null
  publisher?: string | null
  description?: string | null
  isbn?: string | null
  asin?: string | null
  language?: string | null
  explicit: boolean
  abridged?: boolean | null
}

export interface BookMedia {
  mediaType: 'book'
  id?: string
  libraryItemId?: string
  metadata: BookMetadata
  coverPath?: string
  tags: string[]
  audioFiles?: AudioFile[]
  chapters?: Chapter[]
  ebookFile?: EBookFile
  duration?: number
  size?: number
  numTracks?: number
  numAudioFiles?: number
  numChapters?: number
  ebookFormat?: string
}

export interface PodcastMedia {
  mediaType: 'podcast'
  id?: string
  libraryItemId?: string
  metadata: PodcastMetadata
  coverPath?: string
  tags: string[]
  episodes?: PodcastEpisode[]
  autoDownloadEpisodes?: boolean
  autoDownloadSchedule?: string
  lastEpisodeCheck?: number
  maxEpisodesToKeep?: number
  maxNewEpisodesToDownload?: number
  size?: number
  numEpisodes?: number
}

export interface PodcastEpisode {
  libraryItemId: string
  podcastId: string
  id: string
  /** legacy */
  oldEpisodeId?: string
  index?: number
  season?: string
  episode?: string
  episodeType?: string
  title: string
  subtitle?: string
  description?: string
  enclosure?: {
    url: string
    type: string
    /** in bytes (as string) */
    length?: string
  }
  guid?: string
  pubDate?: string
  chapters: Chapter[]
  audioFile?: AudioFile
  publishedAt?: number
  addedAt: number
  updatedAt: number
  audioTrack?: {
    index: number
    startOffset: number
    duration: number
    title: string
    contentUrl: string
    mimeType: string
    codec?: string
    metadata: AudioFile['metadata']
  }
}

export interface PodcastEpisodeDownload {
  id: string
  episodeDisplayTitle?: string
  url: string
  libraryItemId: string
  libraryId?: string
  isFinished: boolean
  failed: boolean
  appendRandomId: boolean
  startedAt?: number
  createdAt: number
  finishedAt?: number
  podcastTitle?: string
  podcastExplicit?: boolean
  season?: number
  episode?: number
  episodeType?: string
  publishedAt?: number
  guid?: string
}

export interface LibraryItem {
  id: string
  ino: string
  oldLibraryItemId?: string
  libraryId: string
  folderId?: string
  path: string
  relPath: string
  isFile: boolean
  mtimeMs: number
  ctimeMs: number
  birthtimeMs: number
  addedAt: number
  updatedAt: number
  lastScan?: number
  scanVersion?: string
  isMissing: boolean
  isInvalid: boolean
  mediaType: 'book' | 'podcast'
  media: BookMedia | PodcastMedia
  libraryFiles?: LibraryFile[]
  size?: number
  numFiles?: number

  // Optional additional data based on includeEntities query parameter
  userMediaProgress?: MediaProgress // included when include=progress
  rssFeed?: RssFeed // included when include=rssfeed
  mediaItemShare?: MediaItemShare // included when include=share
  episodeDownloadsQueued?: PodcastEpisodeDownload[] // included when include=downloads
  episodesDownloading?: PodcastEpisodeDownload[] // included when include=downloads
  numEpisodesIncomplete?: number // included in some contexts
  recentEpisode?: PodcastEpisode // included in some contexts (podcasts only)
  collapsedSeries?: CollapsedSeries // included when collapseseries=1
}

export interface BookLibraryItem extends LibraryItem {
  mediaType: 'book'
  media: MediaByType<'book'>
}

export interface PodcastLibraryItem extends LibraryItem {
  mediaType: 'podcast'
  media: MediaByType<'podcast'>
}

export interface LibraryItemQueryParams {
  include?: string // Comma-separated list: progress, rssfeed, share, downloads
  expanded?: number // 1 for expanded view
  episode?: string // Episode ID for progress
}

export interface MediaProgress {
  id: string
  libraryItemId: string
  episodeId?: string
  displayTitle: string
  displaySubtitle?: string // episode title for podcasts
  duration: number
  progress: number
  currentTime: number
  isFinished: boolean
  hideFromContinueListening?: boolean
  ebookLocation?: string
  ebookProgress: number
  finishedAt?: number
  lastUpdate: number
  startedAt?: number
  lastPlayedAt?: number
  libraryId?: string
  mediaItemId?: string
  mediaItemType?: string
  userId?: string
}

export interface AudioBookmark {
  libraryItemId: string
  title: string
  /** in seconds */
  time: number
  createdAt: number
}

export interface RssFeedMeta {
  author: string
  description: string
  explicit: boolean
  feedUrl: string
  imageUrl: string
  language: string
  link: string
  ownerEmail: string | null
  ownerName: string | null
  preventIndexing: boolean
  title: string
  type: 'serial' | 'episodic'
}

export interface RssFeed {
  id: string
  slug: string
  entityId: string
  entityType: string
  entityUpdatedAt: number
  coverPath: string
  feedUrl: string
  serverAddress: string
  userId: string
  episodes?: PodcastEpisode[]
  meta: RssFeedMeta
  createdAt: number
  updatedAt: number
}

export interface MediaItemShare {
  id: string
  mediaItemId: string
  mediaItemType: 'book' | 'podcastEpisode'
  slug: string
  /** null for no expiration */
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  isDownloadable: boolean
}

export interface EReaderDevice {
  name: string
  email: string
  availabilityOption: 'adminOrUp' | 'userOrUp' | 'guestOrUp' | 'specificUsers'
  /** User IDs with access (only when availabilityOption is 'specificUsers') */
  users?: string[]
}

export interface CustomMetadataProvider {
  id: string
  name: string
  mediaType: 'book' | 'podcast'
  url: string
  authHeaderValue: string | null
  createdAt: string
  updatedAt: string
}

export interface Backup {
  id: string
  key: string | null
  backupDirPath: string
  datePretty: string
  fullPath: string
  path: string
  filename: string
  fileSize: number
  createdAt: number
  serverVersion: string | null
}

export interface BookShelf {
  id:
    | 'continue-listening'
    | 'continue-reading'
    | 'continue-series'
    | 'recently-added'
    | 'discover'
    | 'listen-again'
    | 'read-again'
  label: string
  labelStringKey: string
  type: PersonalizedShelfType
  entities: (LibraryItem | CollapsedSeries)[]
  total: number
}

export interface EpisodeShelf {
  id: 'newest-episodes'
  label: string
  labelStringKey: string
  type: PersonalizedShelfType
  entities: LibraryItem[]
  total: number
}

export interface SeriesShelf {
  id: 'recent-series'
  label: string
  labelStringKey: string
  type: PersonalizedShelfType
  entities: Series[]
  total: number
}

export interface AuthorShelf {
  id: 'newest-authors'
  label: string
  labelStringKey: string
  type: PersonalizedShelfType
  entities: Author[]
  total: number
}

export type PersonalizedShelf = BookShelf | EpisodeShelf | SeriesShelf | AuthorShelf

export interface MetadataProvider {
  /** Provider identifier (e.g. 'google', 'audible', 'itunes') */
  value: string
  /** Display name (e.g. 'Google Books', 'Audible.com') */
  text: string
}

export interface BookSearchResult {
  title?: string
  subtitle?: string
  author?: string
  narrator?: string | string[]
  cover?: string
  covers?: string[]
  description?: string
  descriptionPlain?: string
  publisher?: string
  publishedYear?: string
  series?: Array<{ series: string; sequence?: string }>
  genres?: string | string[]
  tags?: string | string[]
  language?: string
  explicit?: boolean
  abridged?: boolean
  isbn?: string
  asin?: string
  duration?: number
  matchConfidence?: number
}

export interface PodcastSearchResult {
  title?: string
  author?: string
  artistName?: string
  cover?: string
  covers?: string[]
  description?: string
  descriptionPlain?: string
  genres?: string | string[]
  tags?: string | string[]
  language?: string
  explicit?: boolean
  feedUrl?: string
  itunesPageUrl?: string
  itunesId?: string | number
  releaseDate?: string
  duration?: number
  trackCount?: number
  matchConfidence?: number
  // Raw API response fields
  pageUrl?: string
  id?: string | number
}

export interface Task {
  id: string
  action: string // 'embed-metadata' | 'encode-m4b'
  data?: {
    libraryId?: string
    libraryItemId?: string
    [key: string]: unknown
  }
  title: string | null
  titleKey: string | null
  titleSubs: string[] | null
  description: string | null
  descriptionKey: string | null
  descriptionSubs: string[] | null
  error: string | null
  errorKey: string | null
  errorSubs: string[] | null
  showSuccess: boolean
  isFailed: boolean
  isFinished: boolean
  startedAt: number | null
  finishedAt: number | null
}

export interface MetadataEmbedQueueUpdate {
  libraryItemId: string
  queued: boolean
}

export interface NarratorObject {
  /** this is the name base64 encoded for use in filters */
  id: string
  name: string
  numBooks: number
}

/**
 * Audio track metadata from server
 */
export interface AudioTrackData {
  index: number
  startOffset: number
  duration: number
  title: string
  contentUrl: string
  mimeType: string
  metadata?: Record<string, unknown>
}

/**
 * Device info sent to server when starting a session
 */
export interface DeviceInfo {
  id: string
  userId: string
  deviceId: string
  ipAddress: string
  // From user agent
  browserName?: string
  browserVersion?: string
  osName?: string
  osVersion?: string
  deviceType?: string
  // From client
  clientVersion?: string
  manufacturer?: string
  model?: string
  sdkVersion?: string // Android only
  clientName?: string
  deviceName?: string
}

/**
 * Playback session response from server
 */
export interface PlaybackSession {
  id: string
  userId: string
  user?: {
    id: string
    username: string
  } | null
  libraryId: string
  libraryItemId: string
  bookId?: string
  episodeId?: string
  mediaType: 'book' | 'podcast'
  mediaMetadata: Record<string, unknown>
  chapters: Chapter[]
  displayTitle: string
  displayAuthor: string
  coverPath?: string
  duration: number
  playMethod: PlayMethod
  mediaPlayer: string
  deviceInfo: DeviceInfo | null
  serverVersion: string
  date: string
  dayOfWeek: string
  timeListening: number
  startTime: number
  currentTime: number
  startedAt: number
  updatedAt: number
  audioTracks: AudioTrackData[]
  manifestUrl?: string
  libraryItem: LibraryItem | null
  open?: boolean
  /** Only for share sessions - it's the only way the share player can know the library cover aspect ratio */
  coverAspectRatio?: 0 | 1
}

/**
 * Payload for starting a playback session
 */
export interface StartSessionDeviceInfo {
  clientName: string
  deviceId: string
}

export interface LoggerDataLog {
  level: number
  levelName: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'TRACE'
  message: string
  source: string // e.g. Server.js:143
  timestamp: string // e.g. 2026-01-20 15:37:42.926
}

export interface RssPodcastChapter {
  id: number
  title: string
  start: number
  end: number
}

export interface RssPodcastEpisode {
  title: string
  subtitle: string
  description: string
  descriptionPlain: string
  pubDate: string
  episodeType: string
  season: string
  episode: string
  author: string
  duration: string
  durationSeconds: number | null
  explicit: string
  publishedAt: number | null
  enclosure: { url: string; type?: string; length?: string }
  guid: string
  chaptersUrl: string
  chaptersType: string
  chapters: RssPodcastChapter[]
}

export interface RssPodcastMetadata {
  title: string
  language: string
  explicit: string
  author: string
  pubDate: string
  link: string
  image: string
  categories: string[]
  feedUrl: string
  description: string
  descriptionPlain: string
  type: string
}

export interface RssPodcast {
  metadata: RssPodcastMetadata
  episodes: RssPodcastEpisode[]
  numEpisodes?: number
}

export type BookshelfEntity = LibraryItem | Series | Collection | Playlist | Author | PodcastEpisode

export type FFProbeData = Record<string, unknown>

export type MediaByType<T extends LibraryItem['mediaType']> = T extends 'book'
  ? BookMedia
  : T extends 'podcast'
    ? PodcastMedia
    : never

export type MatchResult = BookSearchResult | PodcastSearchResult

export interface ChapterAIInsights {
  summary: string
  keyTakeaways: string[]
  mood?: string
}

export interface BookAIInsights {
  bookId: string
  title: string
  author: string | null
  summary: string
  keyTakeaways: string[]
  mood: string
  themes: string[]
  isCached: boolean
}
