import SharePlayer from './SharePlayer'

export const dynamic = 'force-dynamic'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

interface SharePageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ t?: string }>
}

export default async function SharePage({ params, searchParams }: SharePageProps) {
  const { slug } = await params
  const { t } = await searchParams
  const startTime = t && !isNaN(Number(t)) ? Number(t) : undefined

  return <SharePlayer slug={slug} startTime={startTime} />
}
