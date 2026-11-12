import { getUsers } from '@/shared/lib/api'
import UsersClient from './UsersClient'

export const dynamic = 'force-dynamic'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default async function UsersPage() {
  const response = await getUsers()
  const profiles = ('users' in response ? response.users : response) as unknown as import('@/types').Profile[]

  return <UsersClient profiles={profiles} />
}
