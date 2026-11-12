import { useQuery } from '@tanstack/react-query'
import { fetchLibraryStatsAction } from '@/features/library/actions/libraryActions'

export function useLibraryStats(libraryId: string | undefined) {
  return useQuery({
    queryKey: ['libraryStats', libraryId],
    queryFn: async () => {
      if (!libraryId) return null
      return fetchLibraryStatsAction(libraryId)
    },
    enabled: !!libraryId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
