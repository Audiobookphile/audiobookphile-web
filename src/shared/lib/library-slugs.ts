export interface LibraryLike {
  id: string
  name: string
}

/**
 * Convert a library name into a clean, URL-safe ASCII slug.
 * Falls back to `library-${id.slice(0, 8)}` if the name produces an empty slug.
 */
export function slugifyLibraryName(name: string, id?: string): string {
  const normalized = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!normalized) {
    return id ? `library-${id.slice(0, 8)}` : 'library'
  }

  return normalized
}

/**
 * Get a unique URL slug for a library.
 * If multiple libraries in allLibraries share the same base slug, disambiguates
 * by appending a short prefix of the library ID.
 */
export function getLibrarySlug(library: LibraryLike, allLibraries?: LibraryLike[]): string {
  const baseSlug = slugifyLibraryName(library.name, library.id)

  if (!allLibraries || allLibraries.length <= 1) {
    return baseSlug
  }

  const collisions = allLibraries.filter((lib) => slugifyLibraryName(lib.name, lib.id) === baseSlug)

  if (collisions.length > 1) {
    // Append first 4 characters of library ID to resolve collision
    return `${baseSlug}-${library.id.slice(0, 4)}`
  }

  return baseSlug
}

/**
 * Resolve a route parameter (which could be either a slug or a raw UUID) to a library.
 * Returns the matched library and whether the parameter was a UUID that should be
 * redirected to its human-readable slug.
 */
export function resolveLibraryFromParam<T extends LibraryLike>(
  param: string,
  allLibraries: T[]
): { library: T; isUuidRedirect: boolean } | undefined {
  if (!param || !allLibraries || allLibraries.length === 0) {
    return undefined
  }

  // 1. Check if param is an exact match for a library UUID
  const byId = allLibraries.find((lib) => lib.id === param)
  if (byId) {
    const canonicalSlug = getLibrarySlug(byId, allLibraries)
    return {
      library: byId,
      isUuidRedirect: param !== canonicalSlug,
    }
  }

  // 2. Check if param matches any library's canonical slug
  const bySlug = allLibraries.find((lib) => getLibrarySlug(lib, allLibraries) === param)
  if (bySlug) {
    return {
      library: bySlug,
      isUuidRedirect: false,
    }
  }

  return undefined
}
