import ResetPasswordForm from './ResetPasswordForm'

export const dynamic = 'force-dynamic'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default function ResetPasswordPage() {
  return (
    <div className="-mt-[var(--header-height)] flex min-h-full items-center justify-center">
      <ResetPasswordForm />
    </div>
  )
}
