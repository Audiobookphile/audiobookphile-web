import { NextResponse } from 'next/server'
import { apiRequest } from '@/shared/lib/api/client'

/**
 * Proxy endpoint for viewing a library file (e.g. local cover image, supplementary file).
 * Requests a signed URL from the Edge API and redirects the browser/img to it.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  try {
    const { id, fileId } = await params

    // Request signed URL from Edge Function
    const data = await apiRequest<{ url: string }>(`/api/items/${id}/file/${fileId}/download`)

    if (!data || !data.url) {
      return NextResponse.json({ error: 'Failed to retrieve signed URL' }, { status: 404 })
    }

    // Redirect to the signed URL (307 Temporary Redirect)
    return NextResponse.redirect(data.url, 307)
  } catch (error) {
    console.error('[FileView] Error retrieving signed URL:', error)
    // The thrown value is an HTTP-shaped error: the API layer throws one
    // with a status and a message. Naming that shape is better than
    // `any`, which would accept anything and check nothing.
    const httpError = error as { status?: number; message?: string }
    if (httpError.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: httpError.message || 'Internal Server Error' },
      { status: httpError.status || 500 }
    )
  }
}
