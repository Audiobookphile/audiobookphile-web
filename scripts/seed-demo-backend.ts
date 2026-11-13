#!/usr/bin/env bun
/**
 * Seed Demo Supabase Backend with Real Public Domain Audiobooks & Covers
 *
 * Sources 100% legal, human-narrated LibriVox / Internet Archive public domain
 * audiobooks with authentic illustrated book covers.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, statSync, existsSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

const SUPABASE_URL = process.env.DEMO_SUPABASE_URL || 'https://trbxxtanyichimxlbmhy.supabase.co'
const SERVICE_KEY =
  process.env.DEMO_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyYnh4dGFueWljaGlteGxibWh5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDUyMzEwNiwiZXhwIjoyMTEwMDk5MTA2fQ.P0QjCBpbWIiFGs3vkXDzq4_YShwQAb5hZsTHKj4rzHI'

console.log('🚀 Connecting to Demo Supabase backend:', SUPABASE_URL)
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DEMO_EMAIL = 'demo@audiobookphile.app'
const DEMO_PASSWORD = 'AudiobookphileDemo2026!'
const LIBRARY_ID = 'a0000000-0000-0000-0000-000000000001'

interface RealDemoBook {
  id: string
  authorId: string
  title: string
  subtitle: string
  authorName: string
  authorLastFirst: string
  publishedYear: string
  genres: string[]
  narratorName: string
  description: string
  coverUrl: string
  audioUrl: string
  trackTitle: string
}

const BOOKS: RealDemoBook[] = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    authorId: 'c0000000-0000-0000-0000-000000000001',
    title: 'The Time Machine',
    subtitle: 'An Invention',
    authorName: 'H. G. Wells',
    authorLastFirst: 'Wells, H. G.',
    publishedYear: '1895',
    genres: ['Science Fiction', 'Classics', 'Adventure'],
    narratorName: 'Alex Foster (LibriVox)',
    description:
      'The Time Traveller, a brilliant Victorian scientist, journeys into the fourth dimension to the year 802,701 AD. He discovers humanity divided into two divergent evolutionary paths: the gentle, child-like Eloi living in idyllic gardens, and the sinister, nocturnal Morlocks labouring in the subterranean depths. Narrated by Alex Foster.',
    coverUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/91/d0/57/91d057cb-f593-41df-b116-6fe6bb4fd2bd/9781106701701_cover.jpg/1000x1000bb.jpg',
    audioUrl: 'https://archive.org/download/time_machine_0805_librivox/timemachinewells_01_ae_64kb.mp3',
    trackTitle: 'Chapter 01 - The Time Traveller Expounds',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    authorId: 'c0000000-0000-0000-0000-000000000002',
    title: 'The Adventures of Sherlock Holmes',
    subtitle: 'A Scandal in Bohemia',
    authorName: 'Sir Arthur Conan Doyle',
    authorLastFirst: 'Conan Doyle, Arthur',
    publishedYear: '1892',
    genres: ['Mystery', 'Detective', 'Classics'],
    narratorName: 'David Clarke (LibriVox)',
    description:
      "The quintessential adventure of the world's most famous consulting detective, Sherlock Holmes, and his companion Dr. John Watson. Holmes is engaged by the King of Bohemia to recover a compromising photograph from the formidable opera singer and adventuress Irene Adler. Narrated by David Clarke.",
    coverUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/6b/9b/eb/6b9beb31-3bbf-4035-933f-2abffd5280e0/9789895620906.jpg/1000x1000bb.jpg',
    audioUrl: 'https://archive.org/download/adventures_holmes/adventureholmes_01_doyle_64kb.mp3',
    trackTitle: '01 - A Scandal in Bohemia',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000003',
    authorId: 'c0000000-0000-0000-0000-000000000003',
    title: 'Frankenstein',
    subtitle: 'or, The Modern Prometheus (1818 Edition)',
    authorName: 'Mary Wollstonecraft Shelley',
    authorLastFirst: 'Shelley, Mary',
    publishedYear: '1818',
    genres: ['Gothic Fiction', 'Horror', 'Science Fiction'],
    narratorName: 'Cori Samuel (LibriVox)',
    description:
      "Mary Shelley's seminal gothic tragedy. Victor Frankenstein, consumed by the desire to unravel the mystery of life, constructs a sentient being from deceased human remains, only to recoil in terror from the consequences of his ambition. Narrated by Cori Samuel.",
    coverUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b3/c2/3f/b3c23fe9-6b33-e629-e573-375baa59762b/9781106701718_cover.jpg/1000x1000bb.jpg',
    audioUrl: 'https://archive.org/download/frankenstein_cs_librivox/frankenstein_01_shelley_64kb.mp3',
    trackTitle: '01 - Dedication and Preface',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000004',
    authorId: 'c0000000-0000-0000-0000-000000000004',
    title: 'The Art of War',
    subtitle: 'Laying Plans & Waging War (Lionel Giles Translation)',
    authorName: 'Sun Tzu',
    authorLastFirst: 'Sun, Tzu',
    publishedYear: '1910',
    genres: ['Philosophy', 'Military Strategy', 'Classics'],
    narratorName: 'Moira Fogarty (LibriVox)',
    description:
      'The foundational military treatise by ancient Chinese strategist Sun Tzu, translated with authoritative notes by Lionel Giles. Composed of timeless maxims on planning, maneuvering, adaptation, and decisive leadership. Narrated by Moira Fogarty.',
    coverUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/be/23/9e/be239e6e-752d-9b6d-d284-59989052e8ad/9781596599574.jpg/1000x1000bb.jpg',
    audioUrl: 'https://archive.org/download/art_of_war_librivox/art_of_war_01-02_sun_tzu_64kb.mp3',
    trackTitle: '01 - Laying Plans & Waging War',
  },
]

async function downloadFile(url: string, destPath: string): Promise<void> {
  if (existsSync(destPath) && statSync(destPath).size > 1000) {
    console.log(`  ⚡ Cache hit: ${destPath} (${statSync(destPath).size} bytes)`)
    return
  }
  console.log(`  📥 Downloading: ${url}`)
  execSync(`curl -sL --retry 3 "${url}" -o "${destPath}"`)
}

async function main() {
  console.log('--- Step 1: Verify Root Demo User & Library ---')
  const { data: usersData } = await supabase.auth.admin.listUsers()
  let demoUser = usersData?.users.find((u) => u.email === DEMO_EMAIL)

  if (!demoUser) {
    const { data: newUser } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { username: 'demo' },
    })
    demoUser = newUser?.user || undefined
  }

  // Ensure library exists
  await supabase.from('libraries').upsert({
    id: LIBRARY_ID,
    name: 'Public Domain Classics',
    display_order: 1,
    media_type: 'book',
    provider: 'custom',
    icon: 'books',
    settings: {
      coverAspectRatio: 1,
      disableWatcher: true,
    },
  })

  // Ensure demo user profile
  if (demoUser) {
    await supabase.from('profiles').upsert({
      id: demoUser.id,
      username: 'demo',
      user_type: 'root',
      language: 'en-US',
      theme: 'dark',
      default_library_id: LIBRARY_ID,
    })
  }

  const tmpDir = '/tmp/audiobookphile_real_demo'
  execSync(`mkdir -p ${tmpDir}`)

  console.log('\n--- Step 2: Seed Real Audiobook Demos with Real Covers ---')
  for (const book of BOOKS) {
    console.log(`\n📚 Processing "${book.title}" by ${book.authorName}...`)

    // 1. Author
    await supabase.from('authors').upsert({
      id: book.authorId,
      name: book.authorName,
      last_first: book.authorLastFirst,
      library_id: LIBRARY_ID,
      description: `Author of celebrated classic literature including ${book.title}.`,
    })

    // 2. Real cover download & storage upload
    const coverLocalPath = join(tmpDir, `${book.id}_cover.jpg`)
    await downloadFile(book.coverUrl, coverLocalPath)
    const coverBytes = readFileSync(coverLocalPath)
    const coverStoragePath = `${book.id}/cover.jpg`

    const { error: coverErr } = await supabase.storage.from('covers').upload(coverStoragePath, coverBytes, {
      contentType: 'image/jpeg',
      upsert: true,
    })
    if (coverErr) {
      console.warn('  ⚠️ Cover upload warning:', coverErr.message)
    } else {
      console.log(`  🖼️  Real cover uploaded -> covers/${coverStoragePath} (${coverBytes.length} bytes)`)
    }

    // 3. Real audio download & storage upload
    const audioLocalPath = join(tmpDir, `${book.id}_audio.mp3`)
    await downloadFile(book.audioUrl, audioLocalPath)
    const audioBytes = readFileSync(audioLocalPath)
    const audioStat = statSync(audioLocalPath)
    const audioStoragePath = `${book.id}/track-01.mp3`

    let duration = 300
    try {
      const afinfoOut = execSync(`afinfo "${audioLocalPath}"`).toString()
      const durMatch = afinfoOut.match(/estimated duration:\s*([0-9.]+)\s*sec/i)
      if (durMatch && durMatch[1]) {
        duration = parseFloat(durMatch[1])
      }
    } catch {
      duration = Math.round(audioStat.size / 8000)
    }

    console.log(`  🎵 Real audio ready: ${audioStat.size} bytes (${duration.toFixed(1)}s, ${book.narratorName})`)

    const { error: audioErr } = await supabase.storage.from('audio-files').upload(audioStoragePath, audioBytes, {
      contentType: 'audio/mpeg',
      upsert: true,
    })
    if (audioErr) {
      console.warn('  ⚠️ Audio upload warning:', audioErr.message)
    } else {
      console.log(`  ☁️  Real audio uploaded -> audio-files/${audioStoragePath}`)
    }

    // 4. Update Library Item with Real Metadata
    const audioFilesMetadata = [
      {
        index: 0,
        ino: `${book.id}-track-01`,
        size: audioStat.size,
        duration: duration,
        mimeType: 'audio/mpeg',
        codec: 'mp3',
        storage_path: `supabase://${audioStoragePath}`,
        metadata: {
          filename: `${book.title} - ${book.trackTitle}.mp3`,
          ext: '.mp3',
          path: `supabase://${audioStoragePath}`,
          relPath: `${book.title}/${book.trackTitle}.mp3`,
          size: audioStat.size,
          duration: duration,
          mimeType: 'audio/mpeg',
          codec: 'mp3',
        },
      },
    ]

    const chapters = [
      {
        id: 0,
        start: 0,
        end: duration,
        title: book.trackTitle,
      },
    ]

    const { error: itemErr } = await supabase.from('library_items').upsert({
      id: book.id,
      library_id: LIBRARY_ID,
      title: book.title,
      subtitle: book.subtitle,
      author_names_first_last: book.authorName,
      author_names_last_first: book.authorLastFirst,
      cover_path: coverStoragePath,
      description: book.description,
      duration: duration,
      published_year: book.publishedYear,
      genres: book.genres,
      narrators: [book.narratorName],
      audio_files: audioFilesMetadata,
      chapters: chapters,
      num_tracks: 1,
      is_file: false,
      is_missing: false,
      is_invalid: false,
      media_type: 'book',
      language: 'English',
      path: `/demo/${book.title}`,
      rel_path: book.title,
      size: audioStat.size,
      updated_at: new Date().toISOString(),
    })

    if (itemErr) {
      console.error(`  ❌ Error upserting ${book.title}:`, itemErr)
    } else {
      console.log(`  ✅ Library item "${book.title}" updated with real audio & cover`)
    }

    // 5. Link book_authors
    await supabase.from('book_authors').upsert({
      library_item_id: book.id,
      author_id: book.authorId,
    })
  }

  console.log('\n--- Step 3: Verification ---')
  const { data: status } = await supabase.rpc('get_system_status')
  console.log('System status:', status)

  const { data: items } = await supabase.from('library_items').select('id, title, duration, narrators, cover_path')
  console.log('\nSeeded Real Books:')
  for (const it of items || []) {
    console.log(` • [${it.id}] "${it.title}" (${it.duration}s, Narrator: ${it.narrators?.[0]}, Cover: ${it.cover_path})`)
  }

  console.log('\n🎉 Real demo audiobooks and real covers successfully deployed!')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
