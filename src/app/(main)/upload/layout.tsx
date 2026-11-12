import type { Metadata } from 'next'
import '../../../assets/globals.css'
import AppBar from '../AppBar'
import UploadLayoutWrapper from './UploadLayoutWrapper'

export const dynamic = 'force-dynamic'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export const metadata: Metadata = {
  title: 'audiobookphile',
  description: 'audiobookphile',
}

export default async function UploadLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <AppBar />
      <UploadLayoutWrapper>{children}</UploadLayoutWrapper>
    </>
  )
}
