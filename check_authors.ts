import { createClient } from '@supabase/supabase-js'

/**
 * Report on author image paths in the database.
 *
 * Run with: bun run check_authors.ts
 *
 * Bun loads `.env.local` automatically, so no dotenv is needed.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (.env.local)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function main(): Promise<void> {
  const { data, error } = await supabase.from('authors').select('id, name, image_path')
  if (error) console.error(error)
  console.log('Total authors:', data?.length)
  console.log('Missing image path:', data?.filter((a) => a.image_path === 'missing').length)
  console.log('Valid image path:', data?.filter((a) => a.image_path && a.image_path !== 'missing').length)
  console.log('Null image path:', data?.filter((a) => !a.image_path).length)
}

main().catch((error: unknown) => {
  console.error('check-authors failed:', error)
  process.exit(1)
})
