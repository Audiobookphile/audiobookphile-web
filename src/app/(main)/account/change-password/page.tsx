import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { getTypeSafeTranslations } from '@/shared/lib/getTypeSafeTranslations'
import { changePassword } from './actions'
import ChangePasswordClient from './ChangePasswordClient'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default async function ChangePasswordPage() {
  const t = await getTypeSafeTranslations()

  return (
    <div className="mx-auto w-full max-w-xl p-8">
      <div className="mb-6 flex items-center gap-4">
        <Link
          aria-label={t('ButtonBack')}
          href="/account"
          className="group text-white/40 transition-colors hover:text-white"
        >
          <div className="rounded-xl bg-white/5 p-2 transition-colors group-hover:bg-white/10">
            <ArrowLeft size={20} />
          </div>
        </Link>
        <h1 className="text-xl font-black tracking-widest text-white/90 uppercase">{t('HeaderChangePassword')}</h1>
      </div>
      <ChangePasswordClient changePassword={changePassword} />
    </div>
  )
}
