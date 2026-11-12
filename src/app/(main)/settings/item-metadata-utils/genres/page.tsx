import { getLibraries, getLibraryFilterData } from '@/shared/lib/api'
import { getTypeSafeTranslations } from '@/shared/lib/getTypeSafeTranslations'
import SettingsContent from '../../SettingsContent'
import GenresClient from './GenresClient'

export const dynamic = 'force-dynamic'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default async function ItemMetadataUtilsGenresPage() {
  const t = await getTypeSafeTranslations()

  // Get genres from the first available library
  let genres: string[] = []
  try {
    const { libraries } = await getLibraries()
    if (libraries.length > 0) {
      const filterData = await getLibraryFilterData(libraries[0].id)
      genres = Array.isArray(filterData?.genres) ? filterData.genres : []
    }
  } catch (err) {
    console.error('Error loading genres', err)
  }

  return (
    <SettingsContent title={t('HeaderManageGenres')} backLink="/settings/item-metadata-utils">
      <GenresClient genres={genres} />
    </SettingsContent>
  )
}
