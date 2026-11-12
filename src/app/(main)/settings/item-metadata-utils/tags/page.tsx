import { getLibraries, getLibraryFilterData } from '@/shared/lib/api'
import { getTypeSafeTranslations } from '@/shared/lib/getTypeSafeTranslations'
import SettingsContent from '../../SettingsContent'
import TagsClient from './TagsClient'

export const dynamic = 'force-dynamic'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default async function ItemMetadataUtilsTagsPage() {
  const t = await getTypeSafeTranslations()

  let tags: string[] = []
  try {
    const { libraries } = await getLibraries()
    if (libraries.length > 0) {
      const filterData = await getLibraryFilterData(libraries[0].id)
      tags = Array.isArray(filterData?.tags) ? filterData.tags : []
    }
  } catch (err) {
    console.error('Error loading tags', err)
  }

  return (
    <SettingsContent title={t('HeaderManageTags')} backLink="/settings/item-metadata-utils">
      <TagsClient tags={tags} />
    </SettingsContent>
  )
}
