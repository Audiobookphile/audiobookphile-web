'use client'

import Link from 'next/link'
import { Fragment } from 'react'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { filterEncode } from '@/shared/lib/filterUtils'
import { formatDuration } from '@/shared/lib/formatDuration'
import { bytesPretty } from '@/shared/lib/string'
import { BookLibraryItem, BookMedia, BookMetadata, PodcastLibraryItem, PodcastMetadata } from '@/types/api'

interface LibraryItemDetailsProps {
  libraryItem: BookLibraryItem | PodcastLibraryItem
}

interface DetailRowProps {
  label: string
  value: string | string[] | undefined
  filterKey?: string
  libraryId?: string
}

function DetailRow({ label, value, filterKey, libraryId }: DetailRowProps) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null

  let displayValue: React.ReactNode
  if (filterKey) {
    if (Array.isArray(value)) {
      displayValue = (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => (
            <Link
              key={v}
              href={`/library/${libraryId}/items?filter=${filterKey}.${filterEncode(v)}`}
              className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary active:scale-95"
            >
              {v}
            </Link>
          ))}
        </div>
      )
    } else {
      displayValue = (
        <Link
          href={`/library/${libraryId}/items?filter=${filterKey}.${filterEncode(value)}`}
          className="text-foreground transition-colors hover:text-primary hover:underline"
        >
          {value}
        </Link>
      )
    }
  } else {
    displayValue = Array.isArray(value) ? value.join(', ') : value
  }

  return (
    <div className="flex items-start py-1">
      <div className="w-28 sm:w-32 text-xs font-bold tracking-wider text-foreground-subdued uppercase pt-0.5">{label}</div>
      <div className="flex-1 text-sm font-medium text-foreground">{displayValue}</div>
    </div>
  )
}

function getLibraryItemDuration(libraryItem: BookLibraryItem | PodcastLibraryItem): number | undefined {
  if (libraryItem.mediaType === 'book') {
    return libraryItem.media?.duration
  } else if (libraryItem.mediaType === 'podcast') {
    return libraryItem.media?.episodes?.reduce((acc, episode) => acc + (episode.audioTrack?.duration || 0), 0)
  }
  return undefined
}

export default function LibraryItemDetails({ libraryItem }: LibraryItemDetailsProps) {
  const t = useTypeSafeTranslations()

  const metadata = libraryItem.media?.metadata
  const isBook = libraryItem.mediaType === 'book'
  const isPodcast = libraryItem.mediaType === 'podcast'

  const bookMetadata = isBook ? (metadata as BookMetadata) : null
  const podcastMetadata = isPodcast ? (metadata as PodcastMetadata) : null

  const duration = getLibraryItemDuration(libraryItem)
  const size = libraryItem.media?.size || 0

  const audioFiles = isBook ? (libraryItem.media as BookMedia)?.audioFiles : undefined
  const firstAudioFile = audioFiles?.[0]
  const audioFilesCount = (libraryItem.media as BookMedia)?.numAudioFiles || audioFiles?.length || 0

  return (
    <div className="mt-6 flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
      {/* Book-specific fields */}
      {isBook && bookMetadata && (
        <>
          <DetailRow
            label={t('LabelNarrators')}
            value={bookMetadata.narrators}
            filterKey="narrators"
            libraryId={libraryItem.libraryId}
          />
          <DetailRow label={t('LabelPublishYear')} value={bookMetadata.publishedYear} />
          <DetailRow
            label={t('LabelPublisher')}
            value={bookMetadata.publisher}
            filterKey="publishers"
            libraryId={libraryItem.libraryId}
          />
          {bookMetadata.abridged !== undefined && (
            <div className="flex items-start py-1">
              <div className="w-28 sm:w-32 text-xs font-bold tracking-wider text-foreground-subdued uppercase pt-0.5">Format</div>
              <div className="flex-1">
                <span className="inline-flex items-center rounded-md border border-white/10 bg-white/10 px-2 py-0.5 text-xs font-semibold text-foreground">
                  {bookMetadata.abridged ? 'Abridged' : 'Unabridged'}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Podcast-specific fields */}
      {isPodcast && podcastMetadata && <DetailRow label={t('LabelPodcastType')} value={podcastMetadata.type} />}

      {/* Common fields */}
      <DetailRow
        label={t('LabelGenres')}
        value={metadata?.genres}
        filterKey="genres"
        libraryId={libraryItem.libraryId}
      />
      <DetailRow
        label={t('LabelTags')}
        value={libraryItem.media?.tags}
        filterKey="tags"
        libraryId={libraryItem.libraryId}
      />
      <DetailRow
        label={t('LabelLanguage')}
        value={metadata?.language}
        filterKey="languages"
        libraryId={libraryItem.libraryId}
      />
      <DetailRow label={t('LabelDuration')} value={formatDuration(duration || 0, t)} />
      <DetailRow label={t('LabelSize')} value={bytesPretty(size)} />

      {/* Audio & Media Technical Specs */}
      {isBook && (
        <>
          {firstAudioFile?.codec && (
            <DetailRow label="Codec" value={firstAudioFile.codec.toUpperCase()} />
          )}
          {firstAudioFile?.bitRate ? (
            <DetailRow
              label="Bitrate"
              value={`${Math.round(firstAudioFile.bitRate / 1000)} kbps`}
            />
          ) : null}
          {firstAudioFile?.channels ? (
            <DetailRow
              label="Channels"
              value={firstAudioFile.channels === 2 ? 'Stereo (2 ch)' : firstAudioFile.channels === 1 ? 'Mono (1 ch)' : `${firstAudioFile.channels} ch`}
            />
          ) : null}
          {audioFilesCount > 0 && (
            <DetailRow
              label="Audio Tracks"
              value={`${audioFilesCount} ${audioFilesCount === 1 ? 'track' : 'tracks'}`}
            />
          )}
        </>
      )}
    </div>
  )
}

