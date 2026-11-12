'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { resetPassword } from '@/features/auth/actions/authActions'
import AuthCard from '@/features/auth/components/AuthCard'
import Btn from '@/shared/ui/Btn'
import TextInput from '@/shared/ui/TextInput'

export default function ResetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')

      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters.')
        return
      }

      setLoading(true)
      const result = await resetPassword(password)
      if (result?.error) {
        setError(result.error)
        setLoading(false)
        return
      }
      // Success — refresh server state then navigate
      router.refresh()
      router.replace('/library')
    },
    [password, confirmPassword, router]
  )

  return (
    <AuthCard title="Set new password" subtitle="Choose a strong password for your account." onSubmit={handleSubmit}>
      <div className="mb-6 flex flex-col gap-4">
        <TextInput
          label="New password"
          value={password}
          type="password"
          autocomplete="new-password"
          onChange={setPassword}
        />
        <TextInput
          label="Confirm new password"
          value={confirmPassword}
          type="password"
          autocomplete="new-password"
          onChange={setConfirmPassword}
        />
      </div>

      {error && <div className="mb-4 text-center text-sm text-red-400">{error}</div>}

      <Btn type="submit" loading={loading} className="w-full">
        Update password
      </Btn>
    </AuthCard>
  )
}
