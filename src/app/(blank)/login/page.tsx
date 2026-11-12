import { Suspense } from 'react'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <div className="-mt-[var(--header-height)] flex min-h-full items-center justify-center">
      <Suspense fallback={<div>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
