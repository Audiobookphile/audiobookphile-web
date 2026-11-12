import { NextResponse } from 'next/server'
import { apiRequest } from '@/shared/lib/api/client'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Request download manifest from Edge Function
    const data = await apiRequest<{ tracks: { url: string }[] }>(`/api/items/${id}/download`)

    if (!data || !data.tracks || data.tracks.length === 0) {
      return NextResponse.json({ error: 'No audio files found' }, { status: 404 })
    }

    if (data.tracks.length > 1) {
      return NextResponse.json(
        {
          error:
            'Downloading multi-file items as a ZIP is not supported in this version. Please download individual files from the tracks list.',
        },
        { status: 400 }
      )
    }

    // Redirect to the first track's signed URL
    return NextResponse.redirect(data.tracks[0].url)
  } catch (error) {
    console.error('Download error:', error)
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
