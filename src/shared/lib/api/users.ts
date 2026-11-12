import { redirect } from 'next/navigation'
import { cache } from 'react'
import {
  CreateApiKeyPayload,
  CreateUpdateApiKeyResponse,
  GetApiKeysResponse,
  GetUsersResponse,
  ServerStatus,
  User,
  UserLoginResponse,
} from '@/types/api'
import { UnauthorizedError } from '../apiErrors'
import { apiRequest } from './client'

export async function createApiKey(payload: CreateApiKeyPayload): Promise<CreateUpdateApiKeyResponse> {
  return apiRequest<CreateUpdateApiKeyResponse>('/api/api-keys', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateApiKey(
  apiKeyId: string,
  payload: CreateApiKeyPayload
): Promise<CreateUpdateApiKeyResponse> {
  return apiRequest<CreateUpdateApiKeyResponse>(`/api/api-keys/${apiKeyId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

/**
 * Batch multiple API requests and handle token refresh if needed.
 * If any request throws UnauthorizedError, redirects to the refresh endpoint.
 *
 * The function preserves the type of each promise, so:
 * const [user, libraries] = await getData(getCurrentUser(), getLibraries())
 * will correctly infer the type of 'user' and 'libraries'.
 */
export const getData = cache(
  async <T extends Promise<unknown>[]>(...promises: T): Promise<{ [K in keyof T]: Awaited<T[K]> }> => {
    try {
      const responses = await Promise.all(promises)
      return responses
    } catch (error) {
      // If any request is unauthorized, redirect to refresh token endpoint
      if (error instanceof UnauthorizedError) {
        const { headers } = await import('next/headers')
        const currentPath = (await headers()).get('x-current-path')
        return redirect(`/internal-api/refresh?redirect=${encodeURIComponent(currentPath || '')}`)
      }
      // Let other errors propagate (Next.js error boundaries will handle them)
      throw error
    }
  }
)

/**
 * Current user response data
 *
 * call revalidateTag('current-user') when server settings change or user is updated
 */
export const getCurrentUser = cache(async (): Promise<UserLoginResponse | null> => {
  try {
    const data = await apiRequest<UserLoginResponse>('/api/me', {
      method: 'GET',
    })
    return data?.user ? data : null
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return null
    }
    console.error('[users] getCurrentUser failed:', err)
    return null
  }
})

export const getServerStatus = cache(async (): Promise<ServerStatus> => {
  return apiRequest<ServerStatus>('/status')
})

export const getUsers = cache(async (queryParams?: string): Promise<GetUsersResponse> => {
  return apiRequest<GetUsersResponse>(`/api/users${queryParams ? `?${queryParams}` : ''}`, {})
})

export const getUser = cache(async (userId: string): Promise<User> => {
  return apiRequest<User>(`/api/users/${userId}`, {})
})

export async function deleteUser(userId: string): Promise<void> {
  return apiRequest<void>(`/api/users/${userId}`, {
    method: 'DELETE',
  })
}

export const getApiKeys = cache(async (): Promise<GetApiKeysResponse> => {
  return apiRequest<GetApiKeysResponse>('/api/api-keys', {})
})

export async function deleteApiKey(apiKeyId: string): Promise<void> {
  return apiRequest<void>(`/api/api-keys/${apiKeyId}`, {
    method: 'DELETE',
  })
}
