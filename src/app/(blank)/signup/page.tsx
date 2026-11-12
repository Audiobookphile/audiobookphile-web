import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

/**
 * Signup page — DISABLED (invitation-only).
 * Redirects to login since self-registration is not allowed.
 */
export default function SignupPage() {
  redirect('/login')
}
