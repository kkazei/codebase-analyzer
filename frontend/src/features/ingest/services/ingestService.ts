import { apiClient } from "@/shared/utils/apiClient";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  IngestProgressResponse,
  IngestRequest,
  IngestResponse,
} from "../types";

export const ingestService = {
  analyze: (payload: AnalyzeRequest): Promise<AnalyzeResponse> =>
    apiClient.post("/api/v1/ingest/analyze", payload).then((response) => response.data),
  progress: (jobId: string): Promise<IngestProgressResponse> =>
    apiClient.get(`/api/v1/ingest/progress/${jobId}`).then((response) => response.data),
  run: (payload: IngestRequest): Promise<IngestResponse> =>
    apiClient.post("/api/v1/ingest", payload).then((response) => response.data),
};
