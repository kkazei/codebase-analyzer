export interface ChatTurn {
  user: string;
  assistant: string;
}

export interface ChatRequest {
  question: string;
  history: ChatTurn[];
}

export interface ChatResponse {
  answer: string;
  sources: Record<string, unknown>[];
}
