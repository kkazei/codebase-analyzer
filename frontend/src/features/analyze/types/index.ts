export interface AnalyzeRepositoryRequest {
  repository_url: string;
  max_files: number;
}

export interface LanguageStat {
  language: string;
  files: number;
}

export interface FileInsight {
  path: string;
  language: string;
  lines: number;
  preview: string;
}

export interface TreeNode {
  name: string;
  kind: "file" | "directory";
  children: TreeNode[];
}

export interface AnalyzeRepositoryResponse {
  repository: string;
  total_files: number;
  total_lines: number;
  top_directories: string[];
  languages: LanguageStat[];
  repository_tree: TreeNode;
  key_files: FileInsight[];
  summary: string;
}

export interface IndexRepositoryRequest {
  repository_url: string;
  max_files: number;
  chunk_size: number;
  chunk_overlap: number;
}

export interface IndexRepositoryResponse {
  repository: string;
  namespace: string;
  files_indexed: number;
  chunks_indexed: number;
  summary: string;
}

export interface ChatRequest {
  repository_url: string;
  question: string;
  top_k: number;
}

export interface ChatSource {
  path: string;
  score: number;
  chunk_index: number;
  preview: string;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
  context_chunks: number;
}
