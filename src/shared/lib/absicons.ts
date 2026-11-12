import {
  AudioLines,
  Book,
  BookOpen,
  Database,
  Image as FileImage,
  HardDrive,
  Headphones,
  Heart,
  Library,
  Mic,
  MicVocal,
  Music,
  Podcast,
  Power,
  Radio,
  Rocket,
  Rss,
  Star,
  Video,
} from 'lucide-react'

/**
 * Mapping from legacy absicons names to Lucide components.
 * This maintains backwards compatibility with database strings while migrating UI.
 */
export const ABS_TO_LUCIDE_MAP = {
  audiobookphile: AudioLines,
  'books-1': Library,
  'microphone-1': Mic,
  radio: Radio,
  podcast: Podcast,
  database: Database,
  'microphone-2': Mic, // Mic2 replaced with Mic as standard
  headphones: Headphones,
  music: Music,
  video: Video,
  'microphone-3': MicVocal,
  'book-1': Book,
  'books-2': BookOpen,
  'file-picture': FileImage,
  'database-1': HardDrive,
  rocket: Rocket,
  power: Power,
  star: Star,
  heart: Heart,
  rss: Rss,
} as const

export const AVAILABLE_ICONS = Object.keys(ABS_TO_LUCIDE_MAP) as (keyof typeof ABS_TO_LUCIDE_MAP)[]
export type AvailableIcon = keyof typeof ABS_TO_LUCIDE_MAP

/**
 * Validates if an icon name is available in the legacy mapping
 */
export function isValidIcon(icon: string): icon is AvailableIcon {
  return icon in ABS_TO_LUCIDE_MAP
}
