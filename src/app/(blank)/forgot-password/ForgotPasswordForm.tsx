'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'
import { forgotPassword } from '@/features/auth/actions/authActions'
import AuthCard from '@/features/auth/components/AuthCard'
import Btn from '@/shared/ui/Btn'
import TextInput from '@/shared/ui/TextInput'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')
      setLoading(true)
      const result = await forgotPassword(email)
      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }
      setSuccess(true)
      setLoading(false)
    },
    [email]
  )

  if (success) {
    return (
      <AuthCard title="Check your email" icon="mail-check">
        <p className="mb-6 text-sm text-foreground-muted">
          We sent a password reset link to <strong>{email}</strong>. Check your inbox and follow the link to reset your
          password.
        </p>
        <Link href="/login" className="text-sm text-accent hover:underline">
          Back to login
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Forgot password"
      subtitle="Enter your email and we'll send you a reset link."
      onSubmit={handleSubmit}
    >
      <div className="mb-6">
        <TextInput label="Email" value={email} type="email" autocomplete="email" onChange={setEmail} />
      </div>

      {error && <div className="mb-4 text-center text-sm text-red-400">{error}</div>}

      <div className="flex flex-col gap-4">
        <Btn type="submit" loading={loading} className="w-full">
          Send reset link
        </Btn>

        <p className="text-center text-sm text-foreground-muted">
          <Link href="/login" className="text-accent hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </AuthCard>
  )
}
