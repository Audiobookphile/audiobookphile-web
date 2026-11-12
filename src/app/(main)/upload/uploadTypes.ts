import { getPathBasename, getPathDirname, getPathExtension, SupportedFileTypes } from '@/shared/lib/fileUtils'
import type { Library } from '@/types/api'

export interface FileWithMetadata extends File {
  filetype?: string | false
  filepath?: string
  mime_type?: string
}

export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    // Audio & Audio Containers
    case 'm4b':
    case 'm4a':
    case 'mp4':
    case 'm4v':
      return 'audio/mp4'
    case 'mp3':
    case 'mpeg':
    case 'mpg':
      return 'audio/mpeg'
    case 'flac':
      return 'audio/flac'
    case 'ogg':
    case 'oga':
    case 'ogv':
      return 'audio/ogg'
    case 'opus':
      return 'audio/opus'
    case 'wav':
      return 'audio/wav'
    case 'webm':
    case 'webma':
      return 'audio/webm'
    case 'aac':
      return 'audio/aac'
    case 'wma':
    case 'wmv':
    case 'asf':
      return 'audio/x-ms-wma'
    case 'aiff':
    case 'aif':
      return 'audio/aiff'
    case 'caf':
      return 'audio/x-caf'
    case 'awb':
    case '3gp':
      return 'audio/amr-wb'
    case 'mkv':
    case 'mka':
      return 'audio/x-matroska'
    case 'avi':
      return 'video/x-msvideo'
    case 'mov':
      return 'video/quicktime'
    case 'flv':
      return 'video/x-flv'

    // E-Books & Documents
    case 'epub':
      return 'application/epub+zip'
    case 'pdf':
      return 'application/pdf'
    case 'mobi':
    case 'prc':
      return 'application/x-mobipocket-ebook'
    case 'azw':
    case 'azw3':
      return 'application/vnd.amazon.ebook'
    case 'cbr':
      return 'application/vnd.comicbook-rar'
    case 'cbz':
      return 'application/vnd.comicbook+zip'
    case 'fb2':
      return 'application/x-fb2'
    case 'djvu':
      return 'image/vnd.djvu'

    // Images
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'avif':
      return 'image/avif'
    case 'gif':
      return 'image/gif'
    case 'svg':
      return 'image/svg+xml'

    // Metadata & Lyrics / Chapters
    case 'cue':
      return 'application/x-cue'
    case 'lrc':
      return 'text/plain'
    case 'abs':
    case 'json':
      return 'application/json'
    case 'txt':
    case 'nfo':
      return 'text/plain'

    default:
      return 'application/octet-stream'
  }
}

export interface UploadItemData {
  itemFiles: FileWithMetadata[]
  otherFiles: FileWithMetadata[]
  ignoredFiles: FileWithMetadata[]
}

export interface CleanedItem extends UploadItemData {
  index: number
  title: string
  author?: string
  series?: string
}

export interface ProcessedItems {
  items: CleanedItem[]
  ignoredFiles: FileWithMetadata[]
  error?: string
}

export interface UploadProgressInfo {
  percent: number
  loaded: number
  total: number
}

/**
 * Check file type based on extension
 */
export function checkFileType(filename: string): string | false {
  if (filename.startsWith('.')) return false

  let ext = getPathExtension(filename)
  if (!ext) return false
  if (ext.startsWith('.')) ext = ext.slice(1)
  ext = ext.toLowerCase()

  for (const filetype in SupportedFileTypes) {
    if (SupportedFileTypes[filetype as keyof typeof SupportedFileTypes].includes(ext)) {
      return filetype
    }
  }
  return false
}

/**
 * Clean book data - extract title, author, series from file path
 */
export function cleanBook(book: UploadItemData, index: number): CleanedItem {
  const audiobook: CleanedItem = {
    index,
    title: '',
    author: '',
    series: '',
    ...book,
  }

  const firstBookFile = book.itemFiles[0]
  if (!firstBookFile?.filepath) {
    return audiobook
  }

  const firstBookPath = getPathDirname(firstBookFile.filepath)
  const dirs = firstBookPath.split('/').filter((d) => !!d && d !== '.')

  if (dirs.length) {
    audiobook.title = dirs.pop() || ''
    if (dirs.length > 1) {
      audiobook.series = dirs.pop()
    }
    if (dirs.length) {
      audiobook.author = dirs.pop()
    }
  } else {
    audiobook.title = getPathBasename(firstBookFile.name, getPathExtension(firstBookFile.name))
  }

  return audiobook
}

/**
 * Clean podcast data - extract title from file path
 */
export function cleanPodcast(item: UploadItemData, index: number): CleanedItem {
  const podcast: CleanedItem = {
    index,
    title: '',
    ...item,
  }

  const firstAudioFile = item.itemFiles[0]
  if (!firstAudioFile?.filepath) return podcast

  const firstPath = getPathDirname(firstAudioFile.filepath)
  const dirs = firstPath.split('/').filter((d) => !!d && d !== '.')

  if (dirs.length) {
    podcast.title = dirs.length > 1 ? dirs[1] : dirs[0]
  } else {
    podcast.title = getPathBasename(firstAudioFile.name, getPathExtension(firstAudioFile.name))
  }

  return podcast
}

/**
 * Clean item based on media type
 */
export function cleanItem(item: UploadItemData, mediaType: string, index: number): CleanedItem {
  if (mediaType === 'podcast') return cleanPodcast(item, index)
  return cleanBook(item, index)
}

/**
 * Process items from FileList (file picker)
 */
export function getItemsFromFilelist(filelist: FileList, mediaType: Library['mediaType']): ProcessedItems {
  const ignoredFiles: FileWithMetadata[] = []
  const otherFiles: FileWithMetadata[] = []
  interface ItemMapEntry extends UploadItemData {
    path: string
  }
  const itemMap: Record<string, ItemMapEntry> = {}

  Array.from(filelist).forEach((file) => {
    const fileWithMeta = file as FileWithMetadata
    const filetype = checkFileType(file.name)

    if (!filetype) {
      ignoredFiles.push(fileWithMeta)
    } else {
      fileWithMeta.filetype = filetype
      fileWithMeta.filepath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
      fileWithMeta.mime_type = getMimeType(file.name)

      if (filetype === 'audio' || (filetype === 'ebook' && mediaType === 'book')) {
        let dir = fileWithMeta.filepath ? getPathDirname(fileWithMeta.filepath) : ''
        if (dir === '.') dir = ''

        if (!itemMap[dir]) {
          itemMap[dir] = {
            path: dir,
            ignoredFiles: [],
            itemFiles: [],
            otherFiles: [],
          }
        }
        itemMap[dir].itemFiles.push(fileWithMeta)
      } else {
        otherFiles.push(fileWithMeta)
      }
    }
  })

  otherFiles.forEach((file) => {
    const dir = getPathDirname(file.filepath || '')
    const findItem = Object.values(itemMap).find((b) => dir.startsWith(b.path))
    if (findItem) {
      findItem.otherFiles.push(file)
    } else {
      ignoredFiles.push(file)
    }
  })

  let items: CleanedItem[]
  let index = 1

  if (
    itemMap[''] &&
    !otherFiles.length &&
    mediaType === 'book' &&
    !itemMap[''].itemFiles.some((f) => f.filetype !== 'audio')
  ) {
    items = itemMap[''].itemFiles.map((audioFile) => {
      return cleanItem({ itemFiles: [audioFile], otherFiles: [], ignoredFiles: [] }, mediaType, index++)
    })
  } else {
    items = Object.values(itemMap).map((i) => {
      i.itemFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
      return cleanItem(i, mediaType, index++)
    })
  }

  return { items, ignoredFiles }
}
