from pydantic import BaseModel, Field


class ChatTurn(BaseModel):
    user: str = Field(..., min_length=1, max_length=4000)
    assistant: str = Field(..., min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)
    history: list[ChatTurn] = Field(default_factory=list)


class ChatResponse(BaseModel):
    answer: str
    sources: list[dict] = Field(default_factory=list)
