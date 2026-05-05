import { useMutation } from "@tanstack/react-query";

import { ingestService } from "../services/ingestService";
import type { AnalyzeRequest, AnalyzeResponse } from "../types";

export function useAnalyzeRepo() {
  return useMutation<AnalyzeResponse, Error, AnalyzeRequest>({
    mutationFn: (payload) => ingestService.analyze(payload),
  });
}