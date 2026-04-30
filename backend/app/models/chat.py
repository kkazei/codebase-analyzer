from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    repository_url: str = Field(..., min_length=1, max_length=500)
    question: str = Field(..., min_length=1, max_length=2000)
    top_k: int = Field(default=5, ge=1, le=20)


class ChatSource(BaseModel):
    path: str
    score: float
    chunk_index: int
    preview: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[ChatSource]
    context_chunks: int
