import { createClient } from '@supabase/supabase-js'
import { loadEnv } from '../scripts/load-env'

await loadEnv(`${import.meta.dir}/..`)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error: _error } = await supabase.from('library_items').select('id, cover_path').limit(5)
  console.info(data)
}
void run()
