import { createClient } from '@supabase/supabase-js'
import { loadEnv } from '../scripts/load-env'

await loadEnv(`${import.meta.dir}/..`)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase.from('authors').select('id, name, book_authors(count)').limit(5)
  console.log(error)
  console.log(JSON.stringify(data, null, 2))
}
void run()
