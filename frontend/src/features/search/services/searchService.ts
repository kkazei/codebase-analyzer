import { apiClient } from "@/shared/utils/apiClient";
import type { SearchRequest, SearchResponse } from "../types";

export const searchService = {
  query: (payload: SearchRequest): Promise<SearchResponse> =>
    apiClient.post("/api/v1/search", payload).then((response) => response.data),
};
