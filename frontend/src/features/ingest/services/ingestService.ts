import { apiClient } from "@/shared/utils/apiClient";
import type { IngestRequest, IngestResponse } from "../types";

export const ingestService = {
  run: (payload: IngestRequest): Promise<IngestResponse> =>
    apiClient.post("/api/v1/ingest", payload).then((response) => response.data),
};
