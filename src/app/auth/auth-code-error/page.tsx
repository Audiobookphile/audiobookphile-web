import Link from 'next/link'
import AuthCard from '@/features/auth/components/AuthCard'
import Btn from '@/shared/ui/Btn'

export const dynamic = 'force-dynamic'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default function AuthCodeErrorPage() {
  return (
    <div className="-mt-[var(--header-height)] flex min-h-full items-center justify-center">
      <AuthCard
        title="Link not valid"
        subtitle="This link is invalid, has expired, or was opened in a different browser or device."
        icon="alert-triangle"
      >
        <div className="mb-6 flex flex-col gap-3">
          <p className="text-sm text-foreground-muted">
            Email links are single-use and expire quickly. Please request a new link:
          </p>
          <ul className="list-inside list-disc space-y-1 text-left text-sm text-foreground-muted">
            <li>
              <Link href="/forgot-password" className="text-accent hover:underline">
                Request a new password reset link
              </Link>
            </li>
            <li>
              <Link href="/login" className="text-accent hover:underline">
                Request a new magic link from the login page
              </Link>
            </li>
          </ul>
          <p className="text-sm text-foreground-muted">If the link still fails, sign in with your password instead.</p>
        </div>

        <Btn to="/login" className="w-full">
          Go to Login
        </Btn>
      </AuthCard>
    </div>
  )
}
