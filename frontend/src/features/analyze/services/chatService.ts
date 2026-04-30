import { apiClient } from "../../../shared/utils/apiClient";
import type { ChatRequest, ChatResponse } from "../types";

export const chatService = {
  query: async (payload: ChatRequest): Promise<ChatResponse> => {
    const response = await apiClient.post<ChatResponse>(
      "/api/v1/chat/query",
      payload
    );
    return response.data;
  },
};
