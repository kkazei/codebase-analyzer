import { useMutation } from "@tanstack/react-query";

import { ingestService } from "../services/ingestService";
import type { IngestRequest, IngestResponse } from "../types";

export function useIngest() {
  return useMutation<IngestResponse, Error, IngestRequest>({
    mutationFn: (payload) => ingestService.run(payload),
  });
}
