import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'
import type { TypeSafeTranslations } from '@/types/translations'

async function TranslationsContent({ children }: { children: (t: TypeSafeTranslations) => React.ReactNode }) {
  const t = await getTranslations()
  return children(t as TypeSafeTranslations)
}

export function WithTranslations({ children }: { children: (t: TypeSafeTranslations) => React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <TranslationsContent>{children}</TranslationsContent>
    </Suspense>
  )
}
