import { useMutation } from "@tanstack/react-query";

import { analyzeService } from "../services/analyzeService";
import type {
  AnalyzeRepositoryRequest,
  AnalyzeRepositoryResponse,
} from "../types";

export function useAnalyzeRepository() {
  return useMutation<AnalyzeRepositoryResponse, Error, AnalyzeRepositoryRequest>({
    mutationFn: (payload) => analyzeService.analyzeRepository(payload),
  });
}
