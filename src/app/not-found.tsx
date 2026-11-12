'use client'

import Link from 'next/link'
import Btn from '@/shared/ui/Btn'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center text-foreground">
      <div className="relative mb-8">
        <h1 className="text-9xl font-extrabold tracking-widest text-primary opacity-20">404</h1>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-12 transform rounded bg-accent px-2 text-sm font-bold text-black">
          Page Not Found
        </div>
      </div>

      <p className="mb-8 max-w-md text-xl font-medium text-foreground-muted">
        Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved or deleted.
      </p>

      <Link href="/">
        <Btn className="px-8 py-3 text-lg">Back to Home</Btn>
      </Link>
    </div>
  )
}
