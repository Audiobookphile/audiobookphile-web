import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const transport = url.searchParams.get('transport')

  // Mock Socket.io Engine.IO handshake for the mobile app
  // Vercel serverless does not support actual WebSockets
  if (transport === 'polling') {
    const handshake = {
      sid: 'dummy-sid-' + Date.now(),
      upgrades: ['websocket'],
      pingInterval: 25000,
      pingTimeout: 5000,
      maxPayload: 1000000,
    }
    // Engine.IO requires the '0' prefix for OPEN packet
    return new NextResponse(`0${JSON.stringify(handshake)}`, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  // For websocket transport attempts, we can't actually upgrade
  // Returning 400 will cause the client to fall back to polling or give up cleanly
  return new NextResponse('WebSockets not supported in serverless environment', {
    status: 400,
  })
}

export async function POST() {
  // Mock Engine.IO POST for polling
  return new NextResponse('ok', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
