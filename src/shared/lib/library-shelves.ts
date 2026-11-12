/**
 * Shared normalization for personalized shelf payloads.
 * Server responses can be missing/null under partial failures — every map
 * call site must go through these helpers to avoid `reading 'map'` crashes.
 */
import type { PersonalizedShelf } from '@/types/api'

export function normalizeShelves(input: unknown): PersonalizedShelf[] {
  if (!Array.isArray(input)) return []
  const shelves: PersonalizedShelf[] = []
  for (const shelf of input) {
    if (!shelf || typeof shelf !== 'object') continue
    const s = shelf as PersonalizedShelf
    if (s.entities !== undefined && !Array.isArray(s.entities)) {
      shelves.push({ ...s, entities: [] })
    } else {
      shelves.push(s)
    }
  }
  return shelves
}

export function shelfEntities<T = unknown>(shelf: { entities?: unknown } | null | undefined): T[] {
  return Array.isArray(shelf?.entities) ? (shelf.entities as T[]) : []
}
