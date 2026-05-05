import { apiClient } from "@/shared/utils/apiClient";
import type { ChatRequest, ChatResponse } from "../types";

export const chatService = {
  ask: (payload: ChatRequest): Promise<ChatResponse> =>
    apiClient.post("/api/v1/chat", payload).then((response) => response.data),
};
