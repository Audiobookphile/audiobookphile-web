import { Suspense } from 'react'
import SetupClient from './SetupClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Setup & Onboarding — Audiobookphile',
  description: 'First-time setup and administrator provisioning for Audiobookphile',
}

export default function SetupPage() {
  return (
    <div className="-mt-[var(--header-height)] flex min-h-full items-center justify-center p-4">
      <Suspense fallback={<div className="text-sm text-foreground-muted">Loading setup wizard...</div>}>
        <SetupClient />
      </Suspense>
    </div>
  )
}
