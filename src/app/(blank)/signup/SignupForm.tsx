'use client'

import Link from 'next/link'
import AuthCard from '@/features/auth/components/AuthCard'

export default function SignupForm() {
  return (
    <AuthCard title="Invitation only" icon="shield-alert">
      <p className="mb-6 text-sm text-foreground-muted">
        Public registration is disabled. New accounts are created by invitation only.
      </p>
      <p className="mb-4 text-sm text-foreground-muted">
        If you&apos;ve received an invitation, check your email for a link to set up your account.
      </p>
      <p className="text-center text-sm text-foreground-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  )
}
