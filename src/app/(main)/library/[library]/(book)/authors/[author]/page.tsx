import { getAuthor } from '@/shared/lib/api'
import AuthorClient from './AuthorClient'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default async function AuthorPage({ params }: { params: Promise<{ author: string; library: string }> }) {
  const { author: authorId } = await params

  let author
  try {
    author = await getAuthor(authorId)
  } catch (err) {
    console.error('Error getting author data', err)
    return null
  }

  if (!author) {
    console.error('Error getting author data')
    return null
  }

  return (
    <div className="w-full p-8">
      <AuthorClient author={author} />
    </div>
  )
}
