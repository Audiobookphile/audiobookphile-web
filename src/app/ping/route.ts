import { NextResponse } from 'next/server'

export async function GET() {
  // Audiobookphile mobile app hits this endpoint when adding a server
  // It expects { "success": true } to confirm the server is valid
  return NextResponse.json({ success: true })
}
