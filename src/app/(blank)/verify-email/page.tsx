import Link from 'next/link'
import AuthCard from '@/features/auth/components/AuthCard'

export const dynamic = 'force-dynamic'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default function VerifyEmailPage() {
  return (
    <div className="-mt-[var(--header-height)] flex min-h-full items-center justify-center">
      <AuthCard title="Verify your email" icon="mail">
        <p className="mb-6 text-sm text-foreground-muted">
          We sent a confirmation link to your email address. Click the link to activate your account.
        </p>
        <p className="text-sm text-foreground-muted">
          Already verified?{' '}
          <Link href="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </AuthCard>
    </div>
  )
}
