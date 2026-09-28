import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { searchService } from "../services/searchService";
import type { SearchResponse } from "../types";

export function useSearch(
  query: string,
  topK = 5,
  filter: Record<string, unknown> | null = null
) {
  const trimmed = query.trim();
  const [debouncedQuery, setDebouncedQuery] = useState(trimmed);

  useEffect(() => {
    const delay = trimmed.length < 2 ? 0 : 280;
    const timeoutId = window.setTimeout(() => setDebouncedQuery(trimmed), delay);
    return () => window.clearTimeout(timeoutId);
  }, [trimmed]);

  const searchQuery = useQuery<SearchResponse>({
    queryKey: ["search", debouncedQuery, topK, filter],
    queryFn: () =>
      searchService.query({ query: debouncedQuery, top_k: topK, filter }),
    enabled: debouncedQuery.length > 1,
    staleTime: 1000 * 60 * 2,
  });

  return {
    ...searchQuery,
    isDebouncing: trimmed.length > 1 && trimmed !== debouncedQuery,
  };
}
