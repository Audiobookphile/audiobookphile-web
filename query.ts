import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

async function run() {
  const { data } = await supabase.from('library_items').select('id, cover_path').limit(5)
  console.log(data)
}
void run()
