'use client'

import { ReactNode } from 'react'

// Stub context — no socket.io-client, no connection attempt.
// The app is fully serverless (Vercel + Supabase); there is no ABS Socket.IO server.

interface SocketProviderProps {
  children: ReactNode
}

export function SocketProvider({ children }: SocketProviderProps) {
  return <>{children}</>
}

export function useSocket() {
  return { socket: null, isConnected: false, connectionError: null }
}

// No-op: socket events are not supported in the serverless architecture
export function useSocketEvent<T>(
  _event: string,
  _callback: ((data: T) => void) | (() => void),
  _dependencies?: unknown[]
): void {
  // no-op
}

// No-op emit
export function useSocketEmit() {
  // The trailing comma is required: in a .tsx file, `<T>` parses as a JSX
  // element, not a type parameter.
  return { emit: <T,>(_event: string, _data?: T) => {} }
}
