export interface SearchRequest {
  query: string;
  top_k?: number;
  filter?: Record<string, unknown> | null;
}

export interface SearchResult {
  id: string;
  score: number;
  title?: string | null;
  content?: string | null;
  metadata?: Record<string, unknown>;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
}
