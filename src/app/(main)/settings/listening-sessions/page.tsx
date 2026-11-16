import { getUsers } from '@/shared/lib/api'
import { User } from '@/types/api'
import { getListeningSessionsData, getOpenListeningSessionsData } from './actions'
import ListeningSessionsClient from './ListeningSessionsClient'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const [usersResponse, sessionsResponse, openSessionsResponse] = await Promise.all([
    getUsers().catch(() => ({ users: [] })),
    getListeningSessionsData({
      page: 1,
      itemsPerPage: 25,
      sort: 'updatedAt',
      desc: true,
    }).catch(() => ({
      total: 0,
      numPages: 1,
      page: 1,
      itemsPerPage: 25,
      sessions: [],
    })),
    getOpenListeningSessionsData().catch(() => ({
      sessions: [],
      shareSessions: [],
    })),
  ])

  const users: User[] = Array.isArray(usersResponse)
    ? (usersResponse as unknown as User[])
    : usersResponse?.users || []

  return (
    <ListeningSessionsClient
      users={users}
      sessionsResponse={sessionsResponse}
      openSessionsResponse={openSessionsResponse}
    />
  )
}

