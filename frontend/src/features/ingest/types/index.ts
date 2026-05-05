export interface IngestRequest {
  repo_url: string;
  branch?: string | null;
}

export interface IngestResponse {
  repo: string;
  branch: string;
  files_indexed: number;
  chunks_indexed: number;
  warnings: string[];
}
