import { useQuery } from "@tanstack/react-query";

import { searchService } from "../services/searchService";
import type { SearchResponse } from "../types";

export function useSearch(query: string, topK = 5) {
  const trimmed = query.trim();

  return useQuery<SearchResponse>({
    queryKey: ["search", trimmed, topK],
    queryFn: () => searchService.query({ query: trimmed, top_k: topK }),
    enabled: trimmed.length > 1,
    staleTime: 1000 * 60 * 2,
  });
}
