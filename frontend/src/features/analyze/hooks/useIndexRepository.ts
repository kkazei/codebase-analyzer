import { useMutation } from "@tanstack/react-query";

import { indexService } from "../services/indexService";
import type {
  IndexRepositoryRequest,
  IndexRepositoryResponse,
} from "../types";

export function useIndexRepository() {
  return useMutation<IndexRepositoryResponse, Error, IndexRepositoryRequest>({
    mutationFn: (payload) => indexService.indexRepository(payload),
    retry: 2,
  });
}
