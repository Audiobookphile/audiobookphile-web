/**
 * Domain types derived from the Supabase-generated schema.
 *
 * All base types are aliases of `Tables<'table_name'>` from the generated
 * `supabase.ts` file so they stay in sync whenever the schema is regenerated.
 *
 * Requirements: 13.2, 13.3, 13.4
 */

import type { AudioFileModel, ChapterModel } from './schemas'
import type { Tables } from './supabase'

// ---------------------------------------------------------------------------
// Base table aliases
// ---------------------------------------------------------------------------

export type Library = Tables<'libraries'>
export type LibraryItem = Tables<'library_items'>
export type Author = Tables<'authors'>
export type Series = Tables<'series'>
export type AudioFile = AudioFileModel
export type Chapter = ChapterModel
export type PodcastEpisode = Tables<'podcast_episodes'>
export type MediaProgress = Tables<'media_progress'>
export type Profile = Tables<'profiles'>
export type Collection = Tables<'collections'>
export type Playlist = Tables<'playlists'>

// ---------------------------------------------------------------------------
// Removed
// ---------------------------------------------------------------------------

/**
 * `Bookmark`, `Narrator`, `LibraryItemExpanded` and `LibraryItemWithProgress`
 * used to live here, and they have gone.
 *
 * The first two were `any`, which is what they had to be: there is no
 * `bookmarks` table and no `narrators` table in the schema, so there was
 * nothing to alias. The other two described a select string that included
 * `book_narrators(narrators(*))` -- a join the database cannot serve.
 *
 * None of the four was imported anywhere: the application uses
 * `AudioBookmark` and `NarratorObject` from `src/types/api`, which are the
 * real shapes. So they were not documenting anything; they were standing in
 * for a relation the schema no longer has, and an `any` is the worst way to
 * leave that standing.
 *
 * If the schema regains those relations, put the types back -- as
 * `Tables<'narrators'>`, so they follow the rule every other type in this
 * file follows.
 */
