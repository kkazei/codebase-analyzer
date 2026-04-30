import { apiClient } from "../../../shared/utils/apiClient";
import type {
  IndexRepositoryRequest,
  IndexRepositoryResponse,
} from "../types";

export const indexService = {
  indexRepository: async (
    payload: IndexRepositoryRequest
  ): Promise<IndexRepositoryResponse> => {
    const response = await apiClient.post<IndexRepositoryResponse>(
      "/api/v1/index/repository",
      payload,
      {
        // Indexing can take longer than regular API calls.
        timeout: 10 * 60 * 1000,
      }
    );
    return response.data;
  },
};
