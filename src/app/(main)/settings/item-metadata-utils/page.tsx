import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { getTypeSafeTranslations } from '@/shared/lib/getTypeSafeTranslations'
import SettingsContent from '../SettingsContent'

export const dynamic = 'force-dynamic'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default async function ItemMetadataUtilsPage() {
  const t = await getTypeSafeTranslations()
  const items = [
    {
      label: t('HeaderManageTags'),
      href: '/settings/item-metadata-utils/tags',
    },
    {
      label: t('HeaderManageGenres'),
      href: '/settings/item-metadata-utils/genres',
    },
    {
      label: t('HeaderCustomMetadataProviders'),
      href: '/settings/item-metadata-utils/custom-metadata-providers',
    },
  ]
  return (
    <SettingsContent title={t('HeaderItemMetadataUtils')}>
      <div className="flex flex-col gap-2 py-4">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md bg-primary/40 p-4 text-foreground-muted hover:bg-primary/60 hover:text-foreground"
          >
            <div className="flex items-center justify-between">
              <span>{item.label}</span>
              <ArrowRight className="text-primary" size={20} aria-hidden="true" />
            </div>
          </Link>
        ))}
      </div>
    </SettingsContent>
  )
}
