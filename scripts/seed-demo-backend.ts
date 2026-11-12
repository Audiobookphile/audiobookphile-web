#!/usr/bin/env bun
/**
 * Seed Demo Supabase Backend (uffjxiwowclumvtnyvol)
 * Seeds 100% legal, public domain classic audiobooks and demo credentials.
 */

import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'
import { readFileSync, statSync, existsSync } from 'fs'
import { join } from 'path'

const SUPABASE_URL = process.env.DEMO_SUPABASE_URL || 'https://uffjxiwowclumvtnyvol.supabase.co'
const SERVICE_KEY =
  process.env.DEMO_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmZmp4aXdvd2NsdW12dG55dm9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDUxNjkwMywiZXhwIjoyMTEwMDkyOTAzfQ.vPkOVGigFfJt_hnR8r-qZc-2ZxS1EnY63cygYelHMUE'

console.log('🚀 Connecting to Demo Supabase backend:', SUPABASE_URL)
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DEMO_EMAIL = 'demo@audiobookphile.app'
const DEMO_PASSWORD = 'AudiobookphileDemo2026!'
const LIBRARY_ID = 'a0000000-0000-0000-0000-000000000001'

interface SeedBook {
  id: string
  authorId: string
  title: string
  subtitle: string
  authorName: string
  authorLastFirst: string
  publishedYear: string
  genres: string[]
  narratorName: string
  voiceName: string
  description: string
  narrationText: string
}

const BOOKS: SeedBook[] = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    authorId: 'c0000000-0000-0000-0000-000000000001',
    title: 'The Time Machine',
    subtitle: 'An Invention',
    authorName: 'H. G. Wells',
    authorLastFirst: 'Wells, H. G.',
    publishedYear: '1895',
    genres: ['Science Fiction', 'Classics', 'Adventure'],
    narratorName: 'Daniel (Audiobookphile Classic)',
    voiceName: 'Daniel (English (UK))',
    description:
      'The Time Traveller, a brilliant Victorian scientist, invents a machine capable of travelling into the fourth dimension. Journeying forward to the year 802,701 AD, he discovers the peaceful, childlike Eloi living above ground, and the monstrous, nocturnal Morlocks lurking in darkness below.',
    narrationText:
      'The Time Machine, by H. G. Wells. Chapter One. The Time Traveller, for so it will be convenient to speak of him, was expounding a recondite matter to us. His grey eyes shone and twinkled, and his usually pale face was flushed and animated. The fire burned brightly, and the soft radiance of the incandescent lights caught the bubbles in our glasses. There was that luxurious after-dinner atmosphere when thought roams gracefully free of the trammels of precision. Any real body must have extension in four dimensions: Length, Breadth, Thickness, and Duration. But through a natural infirmity of the flesh, we incline to overlook this fact.',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    authorId: 'c0000000-0000-0000-0000-000000000002',
    title: 'The Adventures of Sherlock Holmes',
    subtitle: 'A Scandal in Bohemia and Other Cases',
    authorName: 'Sir Arthur Conan Doyle',
    authorLastFirst: 'Conan Doyle, Arthur',
    publishedYear: '1892',
    genres: ['Mystery', 'Detective', 'Classics'],
    narratorName: 'Daniel (Audiobookphile Classic)',
    voiceName: 'Daniel (English (UK))',
    description:
      "A collection of twelve gripping detective stories chronicling the adventures of the eccentric consulting detective Sherlock Holmes and his companion Dr. John Watson, beginning with Holmes's encounter with the formidable Irene Adler.",
    narrationText:
      'The Adventures of Sherlock Holmes, by Sir Arthur Conan Doyle. To Sherlock Holmes she is always THE woman. I have seldom heard him mention her under any other name. In his eyes she eclipses and predominates the whole of her sex. It was not that he felt any emotion akin to love for Irene Adler. All emotions were abhorrent to his cold, precise but admirably balanced mind. He was, I take it, the most perfect reasoning and observing machine that the world has seen. But as a lover he would have placed himself in a false position. He never spoke of the softer passions, save with a gibe and a sneer.',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000003',
    authorId: 'c0000000-0000-0000-0000-000000000003',
    title: 'Frankenstein',
    subtitle: 'or, The Modern Prometheus',
    authorName: 'Mary Wollstonecraft Shelley',
    authorLastFirst: 'Shelley, Mary',
    publishedYear: '1818',
    genres: ['Gothic Fiction', 'Horror', 'Science Fiction'],
    narratorName: 'Shelley (Audiobookphile Classic)',
    voiceName: 'Shelley (English (UK))',
    description:
      'Victor Frankenstein, driven by ambitious scientific passion, discovers the secret of generating life. But when his towering creation stirs, horror overwhelms him, unleashing a tragedy of hubris, loneliness, and vengeance across the frozen Arctic.',
    narrationText:
      'Frankenstein; or, The Modern Prometheus, by Mary Shelley. It was on a dreary night of November that I beheld the accomplishment of my toils. With an anxiety that almost amounted to agony, I collected the instruments of life around me, that I might infuse a spark of being into the lifeless thing that lay at my feet. It was already one in the morning; the rain pattered dismally against the panes, and my candle was nearly burnt out, when, by the glimmer of the half-extinguished light, I saw the dull yellow eye of the creature open; it breathed hard, and a convulsive motion agitated its limbs.',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000004',
    authorId: 'c0000000-0000-0000-0000-000000000004',
    title: 'The Art of War',
    subtitle: 'The Definitive Translation by Lionel Giles',
    authorName: 'Sun Tzu',
    authorLastFirst: 'Sun, Tzu',
    publishedYear: '1910',
    genres: ['Philosophy', 'Military Strategy', 'Classics'],
    narratorName: 'Samantha (Audiobookphile Classic)',
    voiceName: 'Samantha (English (US))',
    description:
      'The definitive classic treatise on strategy and conflict resolution. Composed of 13 chapters, each devoted to one aspect of warfare, its timeless principles apply directly to strategy, negotiation, and leadership.',
    narrationText:
      'The Art of War, by Sun Tzu. Translated by Lionel Giles. Chapter One: Laying Plans. Sun Tzu said: The art of war is of vital importance to the State. It is a matter of life and death, a road either to safety or to ruin. Hence it is a subject of inquiry which can on no account be neglected. The art of war, then, is governed by five constant factors: The Moral Law; Heaven; Earth; The Commander; and Method and discipline. These five heads should be familiar to every general: he who knows them will be victorious; he who knows them not will fail.',
  },
]

async function main() {
  console.log('--- Step 1: Ensure Root Demo User ---')
  const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers()
  if (listErr) {
    console.error('Error listing users:', listErr)
    process.exit(1)
  }

  let demoUser = usersData?.users.find((u) => u.email === DEMO_EMAIL)
  if (!demoUser) {
    console.log(`Creating demo user: ${DEMO_EMAIL}`)
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { username: 'demo' },
    })
    if (createErr || !newUser.user) {
      console.error('Failed to create demo user:', createErr)
      process.exit(1)
    }
    demoUser = newUser.user
    console.log(`Demo user created with ID: ${demoUser.id}`)
  } else {
    console.log(`Demo user already exists: ${demoUser.id}`)
    // Reset password to standard demo credentials
    await supabase.auth.admin.updateUserById(demoUser.id, {
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { username: 'demo' },
    })
  }

  // Ensure profile has user_type = 'root'
  const { error: profErr } = await supabase
    .from('profiles')
    .upsert({
      id: demoUser.id,
      username: 'demo',
      user_type: 'root',
      language: 'en-US',
      theme: 'dark',
      default_library_id: LIBRARY_ID,
    })
  if (profErr) {
    console.error('Failed to upsert demo profile:', profErr)
  } else {
    console.log('✅ Demo profile configured as root admin')
  }

  console.log('--- Step 2: Ensure Demo Library ---')
  const { error: libErr } = await supabase.from('libraries').upsert({
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
  if (libErr) {
    console.error('Failed to upsert library:', libErr)
    process.exit(1)
  }
  console.log('✅ Demo library "Public Domain Classics" upserted')

  console.log('--- Step 3: Generate Covers via Swift ---')
  const tmpDir = '/tmp/audiobookphile_demo'
  execSync(`mkdir -p ${tmpDir}`)
  const swiftScript = join(import.meta.dir, 'generate-covers.swift')
  execSync(`swift "${swiftScript}" "${tmpDir}"`)

  console.log('--- Step 4: Seed Audiobooks ---')
  for (const book of BOOKS) {
    console.log(`\n📚 Processing "${book.title}" by ${book.authorName}...`)

    // 1. Author
    const { error: authorErr } = await supabase.from('authors').upsert({
      id: book.authorId,
      name: book.authorName,
      last_first: book.authorLastFirst,
      library_id: LIBRARY_ID,
      description: `Author of classic works including ${book.title}.`,
    })
    if (authorErr) console.warn('Author upsert warning:', authorErr)

    // 2. Cover image upload to storage
    const coverPathLocal = join(tmpDir, `${book.id}.jpg`)
    const coverStoragePath = `${book.id}/cover.jpg`
    if (existsSync(coverPathLocal)) {
      const coverBytes = readFileSync(coverPathLocal)
      const { error: coverUpErr } = await supabase.storage.from('covers').upload(coverStoragePath, coverBytes, {
        contentType: 'image/jpeg',
        upsert: true,
      })
      if (coverUpErr) {
        console.warn('Cover upload warning:', coverUpErr)
      } else {
        console.log(`  🖼️  Cover uploaded -> covers/${coverStoragePath}`)
      }
    }

    // 3. Audio generation & upload
    const aiffPath = join(tmpDir, `${book.id}.aiff`)
    const m4bPath = join(tmpDir, `${book.id}.m4b`)
    const audioStoragePath = `${book.id}/track-01.m4b`

    console.log(`  🎙️  Synthesizing narration via ${book.voiceName}...`)
    execSync(`say -v "${book.voiceName}" "${book.narrationText.replace(/"/g, '\\"')}" -o "${aiffPath}"`)
    execSync(`afconvert -d aac -f m4af "${aiffPath}" "${m4bPath}"`)

    const audioStat = statSync(m4bPath)
    const audioBytes = readFileSync(m4bPath)

    // Measure duration via afinfo
    let duration = 30
    try {
      const afinfoOut = execSync(`afinfo "${m4bPath}"`).toString()
      const durMatch = afinfoOut.match(/estimated duration:\s*([0-9.]+)\s*sec/i)
      if (durMatch && durMatch[1]) {
        duration = parseFloat(durMatch[1])
      }
    } catch {
      duration = Math.max(15, Math.round(audioStat.size / 16000))
    }

    console.log(`  🎵  Audio generated: ${audioStat.size} bytes (${duration.toFixed(1)}s)`)

    const { error: audioUpErr } = await supabase.storage.from('audio-files').upload(audioStoragePath, audioBytes, {
      contentType: 'audio/mp4',
      upsert: true,
    })
    if (audioUpErr) {
      console.warn('Audio upload warning:', audioUpErr)
    } else {
      console.log(`  ☁️  Audio uploaded -> audio-files/${audioStoragePath}`)
    }

    // 4. Upsert Library Item
    const audioFilesMetadata = [
      {
        index: 0,
        ino: `${book.id}-track-01`,
        size: audioStat.size,
        duration: duration,
        mimeType: 'audio/mp4',
        codec: 'aac',
        storage_path: `supabase://${audioStoragePath}`,
        metadata: {
          filename: `${book.title} - Chapter 1.m4b`,
          ext: '.m4b',
          path: `supabase://${audioStoragePath}`,
          relPath: `${book.title}/Chapter 1.m4b`,
          size: audioStat.size,
          duration: duration,
          mimeType: 'audio/mp4',
          codec: 'aac',
        },
      },
    ]

    const chapters = [
      {
        id: 0,
        start: 0,
        end: duration,
        title: 'Chapter 1',
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
      is_file: false,
      is_missing: false,
      is_invalid: false,
      media_type: 'book',
      language: 'English',
      path: `/demo/${book.title}`,
      rel_path: book.title,
      size: audioStat.size,
    })

    if (itemErr) {
      console.error(`Error upserting ${book.title}:`, itemErr)
    } else {
      console.log(`  ✅  Library item "${book.title}" upserted`)
    }

    // 5. Link book_authors
    await supabase.from('book_authors').upsert({
      library_item_id: book.id,
      author_id: book.authorId,
    })
  }

  console.log('\n--- Step 5: Verification & System Status ---')
  const { data: status, error: statErr } = await supabase.rpc('get_system_status')
  console.log('RPC get_system_status:', status)

  // Test sign in
  const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  })
  if (loginErr || !loginData.session) {
    console.error('❌ Demo login test failed:', loginErr)
  } else {
    console.log('✅ Demo login test succeeded! User:', loginData.user.email)
  }

  console.log('\n🎉 Demo backend seeding complete!')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
