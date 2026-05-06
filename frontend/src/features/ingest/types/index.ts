export interface IngestRequest {
  repo_url: string;
  branch?: string | null;
  job_id?: string | null;
}

export interface AnalyzeRequest {
  repo_url: string;
  branch?: string | null;
}

export interface AnalyzeResponse {
  repo: string;
  branch: string;
  file_count: number;
  total_bytes: number;
  top_level_entries: string[];
  file_paths: string[];
}

export interface IngestResponse {
  repo: string;
  branch: string;
  files_indexed: number;
  chunks_indexed: number;
  reused: boolean;
  warnings: string[];
  top_level_entries: string[];
  sample_files: string[];
  job_id: string;
}

export interface IngestProgressResponse {
  job_id: string;
  status: string;
  files_total: number;
  files_processed: number;
  chunks_indexed: number;
  percent: number;
}
