import { useMutation } from "@tanstack/react-query";

import { chatService } from "../services/chatService";
import type { ChatRequest, ChatResponse } from "../types";

export function useChat() {
  return useMutation<ChatResponse, Error, ChatRequest>({
    mutationFn: (payload) => chatService.ask(payload),
  });
}
