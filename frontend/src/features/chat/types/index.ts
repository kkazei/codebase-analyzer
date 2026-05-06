export interface ChatTurn {
  user: string;
  assistant: string;
}

export interface ChatRequest {
  question: string;
  history: ChatTurn[];
  filter?: Record<string, unknown> | null;
}

export interface ChatResponse {
  answer: string;
  sources: Record<string, unknown>[];
}
