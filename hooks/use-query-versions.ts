import { useQuery } from "@tanstack/react-query"
import type { QueryVersion } from "@/types/query"

export function useQueryVersions(queryId: string) {
  const { data: versions, isLoading, error, refetch } = useQuery<QueryVersion[]>({
    queryKey: ["queries", queryId, "versions"],
    queryFn: async () => {
      const response = await fetch(`/api/queries/${queryId}/versions`)
      if (!response.ok) {
        throw new Error("Failed to fetch query versions")
      }
      return response.json()
    },
    enabled: !!queryId,
  })

  return {
    versions: versions || [],
    isLoading,
    error,
    refetch,
  }
}
