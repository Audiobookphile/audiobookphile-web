'use client'

import { Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import AuthCard from '@/features/auth/components/AuthCard'

export default function SignupForm() {
  const [needsSetup, setNeedsSetup] = useState(false)

  useEffect(() => {
    fetch('/api/setup/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.database && data.database.hasAdmin === false) {
          setNeedsSetup(true)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <AuthCard title={needsSetup ? 'First-Time Setup' : 'Invitation only'} icon={needsSetup ? 'key' : 'shield-alert'}>
      {needsSetup ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-accent/30 bg-accent/10 p-4 text-sm text-foreground">
            <div className="flex items-center gap-2 font-semibold text-accent mb-1">
              <Sparkles className="h-4 w-4" />
              <span>Uninitialized Instance Detected</span>
            </div>
            <p className="text-foreground-muted text-xs leading-relaxed">
              No administrator account exists yet for this deployment. As the owner/deployer, you can claim the root administrator role using the setup wizard.
            </p>
          </div>

          <Link
            href="/setup"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Launch Setup Wizard &rarr;
          </Link>

          <p className="text-center text-xs text-foreground-muted">
            Already configured?{' '}
            <Link href="/login" className="text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      ) : (
        <>
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
        </>
      )}
    </AuthCard>
  )
}
