import { apiClient } from "../../../shared/utils/apiClient";
import type {
  AnalyzeRepositoryRequest,
  AnalyzeRepositoryResponse,
} from "../types";

export const analyzeService = {
  analyzeRepository: async (
    payload: AnalyzeRepositoryRequest
  ): Promise<AnalyzeRepositoryResponse> => {
    const response = await apiClient.post<AnalyzeRepositoryResponse>(
      "/api/v1/analyze/repository",
      payload
    );
    return response.data;
  },
};
