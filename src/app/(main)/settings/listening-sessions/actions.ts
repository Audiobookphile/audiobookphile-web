'use server'

import { revalidatePath } from 'next/cache'
import {
  batchDeleteListeningSessions as apiBatchDeleteListeningSessions,
  closeListeningSession as apiCloseListeningSession,
  deleteListeningSession as apiDeleteListeningSession,
  getListeningSessions as apiGetListeningSessions,
  getOpenListeningSessions as apiGetOpenListeningSessions,
} from '@/shared/lib/api'
import { GetListeningSessionsResponse, GetOpenListeningSessionsResponse } from '@/types/api'

export interface ListeningSessionsQueryParams {
  page: number
  itemsPerPage: number
  sort: string
  desc: boolean
  user?: string
}

export async function getListeningSessionsData(
  params: ListeningSessionsQueryParams
): Promise<GetListeningSessionsResponse> {
  const queryParams = new URLSearchParams()
  queryParams.set('page', params.page.toString())
  queryParams.set('itemsPerPage', params.itemsPerPage.toString())
  queryParams.set('sort', params.sort)
  queryParams.set('desc', params.desc ? '1' : '0')
  if (params.user) {
    queryParams.set('user', params.user)
  }

  return apiGetListeningSessions(queryParams.toString())
}

export async function getOpenListeningSessionsData(): Promise<GetOpenListeningSessionsResponse> {
  return apiGetOpenListeningSessions()
}

export async function batchDeleteListeningSessions(sessionIds: string[]): Promise<void> {
  await apiBatchDeleteListeningSessions(sessionIds)
  revalidatePath('/settings/listening-sessions')
}

export async function deleteListeningSession(sessionId: string): Promise<void> {
  await apiDeleteListeningSession(sessionId)
  revalidatePath('/settings/listening-sessions')
}

export async function closeListeningSession(sessionId: string): Promise<void> {
  await apiCloseListeningSession(sessionId)
  revalidatePath('/settings/listening-sessions')
}
