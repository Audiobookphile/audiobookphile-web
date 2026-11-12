// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default function Page() {
  return (
    <div className="text-fg-muted p-6 text-center">
      <p>This feature is not available in the Supabase-backed version.</p>
    </div>
  )
}
