import type { Metadata } from 'next'
import Image from 'next/image'
import '../../assets/globals.css'

export const dynamic = 'force-dynamic'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export const metadata: Metadata = {
  title: 'audiobookphile - Login',
}

export default function BlankLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="page-bg-gradient h-full">
      <div className="flex h-16 w-full items-center justify-start px-2 md:px-6">
        <Image
          src="/images/icon64.png"
          alt=""
          width={40}
          height={40}
          className="me-2 h-8 w-8 min-w-8 sm:me-4 sm:h-10 sm:w-10 sm:min-w-10"
        />
        <p className="hidden text-xl lg:block">audiobookphile</p>
      </div>
      <div className="h-[calc(100vh-var(--header-height))]">
        <div className="h-full w-full overflow-x-hidden overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
