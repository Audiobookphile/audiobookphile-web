import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SettingsDrawerProvider } from '@/shared/contexts/SettingsDrawerContext'
import { getCurrentUser } from '@/shared/lib/api'
import '../../../assets/globals.css'
import AppBar from '../AppBar'
import SettingsLayoutWrapper from './SettingsLayoutWrapper'

export const dynamic = 'force-dynamic'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export const metadata: Metadata = {
  title: 'audiobookphile',
  description: 'audiobookphile',
}

export default async function SettingsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let currentUser
  try {
    currentUser = await getCurrentUser()
  } catch {
    redirect('/login')
  }

  if (!currentUser?.user) {
    redirect('/login')
  }

  return (
    <SettingsDrawerProvider>
      <AppBar />
      <SettingsLayoutWrapper>{children}</SettingsLayoutWrapper>
    </SettingsDrawerProvider>
  )
}
