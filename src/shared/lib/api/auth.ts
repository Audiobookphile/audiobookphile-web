import { apiRequest } from './client'

export async function changePassword(newPassword: string): Promise<void> {
  return apiRequest<void>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ newPassword }),
  })
}
