import { cache } from 'react'
import {
  Author,
  AuthorImagePayload,
  AuthorQuickMatchPayload,
  AuthorResponse,
  AuthorUpdateResponse,
  GetFilesystemPathsResponse,
  GetNarratorsResponse,
  UpdateAuthorPayload,
} from '@/types/api'
import { apiRequest } from '../client'

/**
 * Quick match an author with an external provider
 */
export async function quickMatchAuthor(
  authorId: string,
  payload: AuthorQuickMatchPayload
): Promise<AuthorUpdateResponse> {
  return apiRequest<AuthorUpdateResponse>(`/api/authors/${authorId}/match`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Update an author's metadata
 */
export async function updateAuthor(authorId: string, payload: UpdateAuthorPayload): Promise<AuthorUpdateResponse> {
  return apiRequest<AuthorUpdateResponse>(`/api/authors/${authorId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

/**
 * Delete an author
 */
export async function deleteAuthor(authorId: string): Promise<void> {
  return apiRequest<void>(`/api/authors/${authorId}`, {
    method: 'DELETE',
  })
}

/**
 * Get filesystem paths for file browser
 */
export async function getFilesystemPaths(path: string, level: number): Promise<GetFilesystemPathsResponse> {
  return apiRequest<GetFilesystemPathsResponse>(`/api/filesystem?path=${encodeURIComponent(path)}&level=${level}`, {})
}

/**
 * Submit an author image
 */
export async function submitAuthorImage(authorId: string, payload: AuthorImagePayload): Promise<AuthorResponse> {
  return apiRequest<AuthorResponse>(`/api/authors/${authorId}/image`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Remove an author image
 */
export async function removeAuthorImage(authorId: string): Promise<AuthorResponse> {
  return apiRequest<AuthorResponse>(`/api/authors/${authorId}/image`, {
    method: 'DELETE',
  })
}

export const getAuthor = cache(async (authorId: string, queryParams?: string): Promise<Author> => {
  return apiRequest<Author>(`/api/authors/${authorId}${queryParams ? `?${queryParams}` : ''}`, {})
})

export const getNarrators = cache(async (libraryId: string) => {
  return apiRequest<GetNarratorsResponse>(`/api/libraries/${libraryId}/narrators`, {})
})

export async function updateNarrator(narratorId: string, payload: Record<string, unknown>): Promise<unknown> {
  return apiRequest<unknown>(`/api/narrators/${narratorId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteNarrator(narratorId: string): Promise<void> {
  return apiRequest<void>(`/api/narrators/${narratorId}`, {
    method: 'DELETE',
  })
}
