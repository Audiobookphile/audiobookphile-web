'use client'

import { Pencil } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useCardSize } from '@/features/library/contexts/CardSizeContext'
import { useLibrary } from '@/features/library/contexts/LibraryContext'
import AuthorImage from '@/features/metadata/components/AuthorImage'
import { useSocketEvent } from '@/shared/contexts/SocketContext'
import { useUser } from '@/shared/contexts/UserContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { filterEncode } from '@/shared/lib/filterUtils'
import AuthorEditModal from '@/shared/modals/AuthorEditModal'
import IconBtn from '@/shared/ui/IconBtn'
import ExpandableHtml from '@/shared/widgets/ExpandableHtml'
import ItemSlider from '@/shared/widgets/ItemSlider'
import BookMediaCard from '@/shared/widgets/media-card/BookMediaCard'
import { Author, BookshelfView } from '@/types/api'

interface AuthorClientProps {
  author: Author
}

export default function AuthorClient({ author: authorProp }: AuthorClientProps) {
  const t = useTypeSafeTranslations()
  const { library, showSubtitles } = useLibrary()
  const { user, serverSettings, ereaderDevices, getMediaItemProgress } = useUser()
  const { sizeMultiplier } = useCardSize()
  const router = useRouter()

  const [author, setAuthor] = useState<Author>(authorProp)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Use local state if available, otherwise fall back to prop
  // This allows immediate UI updates after editing
  const libraryItems = author.libraryItems || []
  const series = author.series || []

  // Sync prop updates to local state
  // This allows the component to reflect new data if the parent (Server Component) re-fetches
  useEffect(() => {
    setAuthor(authorProp)
  }, [authorProp])

  const handleAuthorUpdated = useCallback(
    (updatedAuthor: Author) => {
      if (updatedAuthor.id === author.id) {
        setAuthor((prev) => ({ ...prev, ...updatedAuthor }))
      }
    },
    [author.id]
  )

  const handleAuthorRemoved = useCallback(
    (data: Author | { id: string; libraryId: string }) => {
      const id = 'id' in data ? data.id : (data as Author).id
      if (id === author.id) {
        // Redirect to authors list if current author is deleted
        router.replace(`/library/${library.id}/authors`)
      }
    },
    [author.id, library.id, router]
  )

  useSocketEvent<Author>('author_updated', handleAuthorUpdated)
  useSocketEvent<Author | { id: string; libraryId: string }>('author_removed', handleAuthorRemoved)

  return (
    <div className="w-full" style={{ fontSize: sizeMultiplier + 'rem' }}>
      <div className="flex flex-col gap-8e md:flex-row">
        <div className="mx-auto w-48e max-w-48e">
          <div className="h-60e w-full">
            <AuthorImage author={author} className="h-full w-full" />
          </div>
        </div>
        <div className="flex-1">
          <div className="mb-2e flex items-center gap-2e">
            <h1 className="text-[1.5em]">{author.name}</h1>
            <IconBtn
              borderless
              size="small"
              // todo add this affect to icon btn?
              iconClass="hover:text-warning hover:scale-120 transition-colors transition-transform duration-100"
              onClick={() => setIsEditModalOpen(true)}
              ariaLabel={t('LabelEdit')}
              icon={Pencil}
            />
          </div>
          {author.description && <ExpandableHtml html={author.description} lineClamp={7} className="max-w-[48em]" />}
        </div>
      </div>

      {libraryItems.length > 0 && (
        <div className="-ms-2e mt-8e">
          <ItemSlider
            title={
              <Link
                href={`/library/${library.id}/items?filter=authors.${filterEncode(author.id)}`}
                className="transition-colors hover:underline"
              >
                {t('LabelXBooks', { count: libraryItems.length })}
              </Link>
            }
            className="!ps-0"
          >
            {libraryItems.map((libraryItem) => {
              const mediaProgress = libraryItem.media?.id ? getMediaItemProgress(libraryItem.media.id) : undefined
              return (
                <div key={libraryItem.id} className="mx-2e shrink-0">
                  <BookMediaCard
                    libraryItem={libraryItem}
                    bookshelfView={BookshelfView.DETAIL}
                    dateFormat={serverSettings?.dateFormat ?? 'MM/dd/yyyy'}
                    timeFormat={serverSettings?.timeFormat ?? 'HH:mm'}
                    userPermissions={user.permissions}
                    ereaderDevices={ereaderDevices}
                    showSubtitles={showSubtitles}
                    mediaProgress={mediaProgress}
                  />
                </div>
              )
            })}
          </ItemSlider>
        </div>
      )}

      {series.map((bookSeries) => {
        const seriesTitle = (
          <>
            <Link href={`/library/${library.id}/series/${bookSeries.id}`} className="transition-colors hover:underline">
              {bookSeries.name}
            </Link>
            <span className="ps-2e text-foreground-subdued">{t('LabelSeries')}</span>
          </>
        )
        return (
          <div key={bookSeries.id} className="-ms-2e shrink-0">
            <ItemSlider title={seriesTitle} className="!ps-0">
              {bookSeries.items?.map((libraryItem) => {
                const mediaProgress = libraryItem.media?.id ? getMediaItemProgress(libraryItem.media.id) : undefined
                return (
                  <div key={libraryItem.id} className="mx-2e shrink-0">
                    <BookMediaCard
                      libraryItem={libraryItem}
                      bookshelfView={BookshelfView.DETAIL}
                      dateFormat={serverSettings?.dateFormat ?? 'MM/dd/yyyy'}
                      timeFormat={serverSettings?.timeFormat ?? 'HH:mm'}
                      userPermissions={user.permissions}
                      ereaderDevices={ereaderDevices}
                      showSubtitles={showSubtitles}
                      mediaProgress={mediaProgress}
                    />
                  </div>
                )
              })}
            </ItemSlider>
          </div>
        )
      })}

      {isEditModalOpen && (
        <AuthorEditModal
          isOpen={isEditModalOpen}
          user={user}
          author={author}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </div>
  )
}
