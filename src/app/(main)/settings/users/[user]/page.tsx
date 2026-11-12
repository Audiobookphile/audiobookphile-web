import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { getUsers } from '@/shared/lib/api'
import { getTypeSafeTranslations } from '@/shared/lib/getTypeSafeTranslations'
import UserClient from './UserClient'

export const dynamic = 'force-dynamic'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default async function UserPage({ params }: { params: Promise<{ user: string }> }) {
  const t = await getTypeSafeTranslations()
  const { user: userId } = await params

  const { users } = await getUsers()
  const user = users.find((u) => u.id === userId)

  if (!user) {
    return null
  }

  return (
    <div className="mx-auto w-full max-w-4xl p-2 md:p-6">
      <div className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <Link
          href="/settings/users"
          className="group mb-6 flex items-center gap-3 text-white/40 transition-colors hover:text-white"
        >
          <div className="rounded-xl bg-white/5 p-2 transition-colors group-hover:bg-white/10">
            <ArrowLeft size={20} />
          </div>
          <span className="text-sm font-black tracking-widest uppercase">{t('LabelBackToUsers')}</span>
        </Link>
        <UserClient user={user} />
      </div>
    </div>
  )
}
