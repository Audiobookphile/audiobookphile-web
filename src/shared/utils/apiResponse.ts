import { NextResponse } from 'next/server'

export interface ApiErrorPayload {
  error: {
    message: string
    code: string
  }
  success: boolean
}

export function apiError(message: string, code: string, status: number = 400) {
  const payload: ApiErrorPayload = {
    error: {
      message,
      code,
    },
    success: false,
  }
  return NextResponse.json(payload, { status })
}
