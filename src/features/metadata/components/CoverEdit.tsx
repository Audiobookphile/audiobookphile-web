'use client'

import { Eye, Image as ImageIcon, RefreshCw, Search, Trash2, Upload, X } from 'lucide-react'
import React, { useEffect, useMemo, useState, useTransition } from 'react'
import { useBookCoverAspectRatio } from '@/features/library/contexts/LibraryContext'
import {
  removeCoverAction,
  setCoverFromLocalFileAction,
  updateCoverFromUrlAction,
  uploadCoverAction,
} from '@/features/metadata/actions/coverActions'
import PreviewCover from '@/features/metadata/components/PreviewCover'
import {
  useBookCoverProviders,
  useMetadata,
  usePodcastCoverProviders,
} from '@/features/metadata/contexts/MetadataContext'
import { useCoverSearch } from '@/features/metadata/hooks/useCoverSearch'
import { useGlobalToast } from '@/shared/contexts/ToastContext'
import { useUser } from '@/shared/contexts/UserContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import {
  getLibraryFileUrl,
  getLibraryItemCoverUrl,
  getPlaceholderCoverUrl,
  isMissingCoverPath,
} from '@/shared/lib/coverUtils'
import { mergeClasses } from '@/shared/lib/merge-classes'
import CoverPreviewModal from '@/shared/modals/CoverPreviewModal'
import Btn from '@/shared/ui/Btn'
import Dropdown from '@/shared/ui/Dropdown'
import FileInput from '@/shared/ui/FileInput'
import TextInput from '@/shared/ui/TextInput'
import Tooltip from '@/shared/ui/Tooltip'
import { BookLibraryItem, LibraryFile, PodcastLibraryItem } from '@/types/api'

interface LocalCover extends LibraryFile {
  localPath: string
}

interface CoverEditProps {
  libraryItem: BookLibraryItem | PodcastLibraryItem
}

export default function CoverEdit({ libraryItem }: CoverEditProps) {
  const bookCoverAspectRatio = useBookCoverAspectRatio()
  const t = useTypeSafeTranslations()
  const { user, userCanDelete } = useUser()
  const { showToast } = useGlobalToast()

  // Transitions for server actions
  const [isPendingUpload, startUploadTransition] = useTransition()
  const [isPendingUpdate, startUpdateTransition] = useTransition()

  const isPodcast = libraryItem.mediaType === 'podcast'

  // Get providers from context based on media type
  const { ensureProvidersLoaded } = useMetadata()
  const bookCoverProviders = useBookCoverProviders()
  const podcastCoverProviders = usePodcastCoverProviders()

  const providers = isPodcast ? podcastCoverProviders : bookCoverProviders

  // Ensure providers are loaded when component mounts
  useEffect(() => {
    ensureProvidersLoaded()
  }, [ensureProvidersLoaded])

  // Cover search via WebSocket
  const handleSearchError = () => {
    showToast(t('MessageCoverSearchFailed'), { type: 'error' })
  }

  const { coversFound, searchInProgress, hasSearched, searchCovers, cancelSearch, resetSearch } =
    useCoverSearch(handleSearchError)

  // State
  const [searchTitle, setSearchTitle] = useState('')
  const [searchAuthor, setSearchAuthor] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [showLocalCovers, setShowLocalCovers] = useState(false)
  const [previewUpload, setPreviewUpload] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [provider, setProvider] = useState('google')
  const [selectedCoverForPreview, setSelectedCoverForPreview] = useState<string | null>(null)

  const media = libraryItem.media || {}
  const coverPath = media.coverPath

  const coverUrl =
    !coverPath || isMissingCoverPath(coverPath)
      ? getPlaceholderCoverUrl()
      : getLibraryItemCoverUrl(libraryItem.id, libraryItem.updatedAt)

  // Keep useMemo for localCovers since it filters and maps an array
  const localCovers = useMemo(() => {
    const libraryFiles = (libraryItem.libraryFiles || []) as LibraryFile[]
    return libraryFiles
      .filter((f) => f.fileType === 'image')
      .map(
        (file): LocalCover => ({
          ...file,
          localPath: getLibraryFileUrl(libraryItem.id, file.ino),
        })
      )
  }, [libraryItem.libraryFiles, libraryItem.id])

  const userCanUpload = user.permissions?.upload || false

  const searchTitleLabel = provider.startsWith('audible')
    ? t('LabelSearchTitleOrASIN')
    : provider === 'itunes'
      ? t('LabelSearchTerm')
      : t('LabelSearchTitle')

  // Initialize component - only run when library item ID changes
  useEffect(() => {
    setShowLocalCovers(false)
    setPreviewUpload(null)
    setSelectedFile(null)
    // Access metadata directly from libraryItem to avoid dependency on computed object
    const metadata = libraryItem.media?.metadata
    const authorNameValue = metadata && 'authorName' in metadata ? metadata.authorName || '' : ''
    setImageUrl('')
    setSearchTitle(typeof metadata?.title === 'string' ? metadata.title : '')
    setSearchAuthor(typeof authorNameValue === 'string' ? authorNameValue : '')
    resetSearch()

    if (isPodcast) {
      setProvider('itunes')
    } else {
      // Migrate from 'all' to 'best' (only once)
      const migrationKey = 'book-cover-provider-migrated'
      const currentProvider =
        localStorage.getItem('book-cover-provider') || localStorage.getItem('book-provider') || 'google'

      if (!localStorage.getItem(migrationKey) && currentProvider === 'all') {
        localStorage.setItem('book-cover-provider', 'best')
        localStorage.setItem(migrationKey, 'true')
        setProvider('best')
      } else {
        setProvider(currentProvider)
      }
    }
  }, [libraryItem, isPodcast, resetSearch])

  // Handlers
  const resetCoverPreview = () => {
    setPreviewUpload(null)
    setSelectedFile(null)
  }

  const submitCoverUpload = () => {
    if (!selectedFile) return

    const fileToUpload = selectedFile

    startUploadTransition(async () => {
      try {
        // Convert File to Base64 for server action
        const arrayBuffer = await fileToUpload.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer)
        const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
        const base64 = btoa(binary)
        await uploadCoverAction(libraryItem.id, base64, fileToUpload.name)
      } catch (error) {
        console.error('Upload error:', error)
        showToast(error instanceof Error ? error.message : t('ToastUnknownError'), { type: 'error' })
      }
    })

    // Reset preview immediately, not inside the transition
    resetCoverPreview()
  }

  const fileUploadSelected = (file: File) => {
    setPreviewUpload(URL.createObjectURL(file))
    setSelectedFile(file)
  }

  const handleRemoveCover = () => {
    if (!coverPath) return

    startUpdateTransition(async () => {
      try {
        await removeCoverAction(libraryItem.id)
      } catch (error) {
        console.error('Error removing cover:', error)
        showToast(error instanceof Error ? error.message : 'Failed to remove cover', { type: 'error' })
      }
    })
  }

  const handleUpdateCover = (cover: string) => {
    startUpdateTransition(async () => {
      try {
        await updateCoverFromUrlAction(libraryItem.id, cover)
        setImageUrl('')
      } catch (error) {
        console.error('Error updating cover:', error)
        showToast(error instanceof Error ? error.message : t('ToastCoverUpdateFailed'), { type: 'error' })
      }
    })
  }

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault()
    handleUpdateCover(imageUrl)
  }

  const persistProvider = () => {
    try {
      localStorage.setItem('book-cover-provider', provider)
    } catch (error) {
      console.error('PersistProvider', error)
    }
  }

  const submitSearchForm = (e: React.FormEvent) => {
    e.preventDefault()

    // Store provider in local storage
    persistProvider()

    // Initiate search via hook
    searchCovers({
      title: searchTitle,
      author: searchAuthor || '',
      provider: provider,
      podcast: isPodcast,
    })
  }

  const handleSetCover = (coverFile: LocalCover) => {
    startUpdateTransition(async () => {
      try {
        const filePath = coverFile.metadata?.path || coverFile.ino
        await setCoverFromLocalFileAction(libraryItem.id, filePath)
      } catch (error) {
        console.error('Error setting cover:', error)
        showToast(error instanceof Error ? error.message : t('ToastCoverUpdateFailed'), { type: 'error' })
      }
    })
  }

  const localCoverImageCount = `${localCovers.length} local ${localCovers.length === 1 ? 'image' : 'images'}`

  const handleCoverClick = (cover: string) => {
    setSelectedCoverForPreview(cover)
  }

  const handleCloseCoverPreview = () => {
    setSelectedCoverForPreview(null)
  }

  const handleApplyCover = () => {
    if (!selectedCoverForPreview) return
    handleCloseCoverPreview()
    handleUpdateCover(selectedCoverForPreview)
  }

  return (
    <div className="relative h-full w-full overflow-hidden overflow-y-auto px-2 py-6 sm:px-4">
      <div className="mb-4 flex flex-col sm:flex-row">
        <div className="relative self-center md:self-start">
          <PreviewCover src={coverUrl} width={120} />

          {/* book cover overlay */}
          {media.coverPath && (
            <div className="absolute top-0 left-0 z-10 h-full w-full opacity-0 transition-opacity duration-100 hover:opacity-100">
              <div className="absolute top-0 left-0 h-16 w-full bg-gradient-to-b from-black/60 to-transparent" />
              {userCanDelete && (
                <button
                  type="button"
                  aria-label={t('LabelRemoveCover')}
                  disabled={isPendingUpdate}
                  className={mergeClasses(
                    'absolute top-1 right-1 h-8 w-8 rounded-full p-1 text-red-500',
                    isPendingUpdate ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:text-red-400'
                  )}
                  onClick={handleRemoveCover}
                >
                  <Tooltip text={t('LabelRemoveCover')} position="top">
                    <Trash2 size={24} strokeWidth={2.5} aria-hidden="true" />
                  </Tooltip>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 grow sm:ps-2 sm:pe-2 md:mt-0 md:ps-6">
          <div className="flex items-center">
            {userCanUpload && (
              <div className="w-10 pe-2 md:w-40 md:min-w-32">
                <FileInput onChange={fileUploadSelected}>
                  <span className="hidden text-[11px] font-black tracking-widest uppercase md:inline-block">
                    {t('ButtonUploadCover')}
                  </span>
                  <Upload size={22} className="md:hidden" />
                </FileInput>
              </div>
            )}

            <form onSubmit={submitForm} className="flex grow">
              <TextInput
                value={imageUrl}
                onChange={setImageUrl}
                placeholder={t('LabelImageURLFromTheWeb')}
                className="h-9 w-full"
                disabled={isPendingUpdate}
              />
              <Btn
                color="bg-success"
                type="submit"
                disabled={!imageUrl || isPendingUpdate}
                loading={isPendingUpdate}
                className="ms-2 h-9 w-24 px-4 sm:ms-3"
              >
                {t('ButtonSubmit')}
              </Btn>
            </form>
          </div>

          {localCovers.length > 0 && (
            <div className="mt-6 mb-4 border-t border-b border-white/10">
              <div className="flex items-center justify-center py-2">
                <p>{localCoverImageCount}</p>
                <div className="grow" />
                <Btn size="small" onClick={() => setShowLocalCovers(!showLocalCovers)}>
                  {showLocalCovers ? t('ButtonHide') : t('ButtonShow')}
                </Btn>
              </div>

              {showLocalCovers && (
                <div className="flex flex-wrap items-center justify-center pb-2">
                  {localCovers.map((localCoverFile) => (
                    <button
                      type="button"
                      aria-label={t('ButtonSelect')}
                      disabled={isPendingUpdate}
                      key={localCoverFile.ino}
                      className={mergeClasses(
                        'm-0.5 mb-5 border-2',
                        isPendingUpdate ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-yellow-300',
                        localCoverFile.metadata.path === coverPath ? 'border-yellow-300' : 'border-transparent'
                      )}
                      onClick={() => handleSetCover(localCoverFile)}
                    >
                      <div className="bg-primary h-24" style={{ width: 96 / bookCoverAspectRatio + 'px' }}>
                        <PreviewCover
                          src={localCoverFile.localPath || ''}
                          width={96 / bookCoverAspectRatio}
                          showResolution={false}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={submitSearchForm}>
        <div className="-mx-1 flex flex-wrap items-center justify-start sm:flex-nowrap">
          <div className="w-48 grow p-1">
            <Dropdown
              value={provider}
              items={providers}
              disabled={searchInProgress}
              label={t('LabelProvider')}
              size="small"
              onChange={(val) => setProvider(String(val))}
            />
          </div>
          <div className="w-72 grow p-1">
            <TextInput
              value={searchTitle}
              onChange={setSearchTitle}
              disabled={searchInProgress}
              label={searchTitleLabel}
              placeholder={t('PlaceholderSearch')}
            />
          </div>
          {provider !== 'itunes' && provider !== 'audiobookcovers' && (
            <div className="w-72 grow p-1">
              <TextInput
                value={searchAuthor}
                onChange={setSearchAuthor}
                disabled={searchInProgress}
                label={t('LabelAuthor')}
              />
            </div>
          )}
          {!searchInProgress ? (
            <Btn className="ms-1 mt-5 px-4 md:min-w-24" type="submit">
              {t('ButtonSearch')}
            </Btn>
          ) : (
            <Btn className="ms-1 mt-5 px-4 md:min-w-24" type="button" color="bg-error" onClick={cancelSearch}>
              {t('ButtonCancel')}
            </Btn>
          )}
        </div>
      </form>

      {hasSearched && (
        <div className="mt-2 flex max-w-full flex-wrap items-center justify-center sm:max-h-80 sm:overflow-y-scroll">
          {searchInProgress && !coversFound.length ? (
            <p className="text-foreground-muted py-4">{t('MessageLoading')}</p>
          ) : !searchInProgress && !coversFound.length ? (
            <p className="text-foreground-muted py-4">{t('MessageNoCoversFound')}</p>
          ) : (
            coversFound.map((cover) => (
              <button
                type="button"
                aria-label={t('LabelCoverPreview')}
                disabled={isPendingUpdate}
                key={cover}
                className={mergeClasses(
                  'm-0.5 mb-5 border-2',
                  isPendingUpdate ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-yellow-300',
                  cover === coverPath ? 'border-yellow-300' : 'border-transparent'
                )}
                onClick={() => handleCoverClick(cover)}
              >
                <PreviewCover src={cover} width={80} />
              </button>
            ))
          )}
        </div>
      )}

      {previewUpload && (
        <div className="bg-primary/95 absolute top-0 left-0 z-20 flex h-full w-full flex-col items-center p-8 backdrop-blur-3xl">
          <p className="mb-8 text-xl font-black tracking-widest text-white/90 uppercase">{t('HeaderPreviewCover')}</p>
          <button
            className="absolute top-6 right-6 text-white/40 transition-colors hover:text-white"
            onClick={resetCoverPreview}
            type="button"
          >
            <X size={32} />
          </button>
          <div className="flex justify-center py-4">
            <PreviewCover src={previewUpload} width={240} />
          </div>
          <div className="absolute right-0 bottom-0 flex px-5 py-4">
            <Btn disabled={isPendingUpload} className="mx-2" onClick={resetCoverPreview}>
              {t('ButtonReset')}
            </Btn>
            <Btn loading={isPendingUpload} color="bg-success" onClick={submitCoverUpload}>
              {t('ButtonUpload')}
            </Btn>
          </div>
        </div>
      )}

      {/* Cover Preview Modal */}
      <CoverPreviewModal
        isOpen={!!selectedCoverForPreview}
        selectedCover={selectedCoverForPreview}
        onClose={handleCloseCoverPreview}
        onApply={handleApplyCover}
      />
    </div>
  )
}
