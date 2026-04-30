from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_chat_service
from app.models.chat import ChatRequest, ChatResponse
from app.services.chat import ChatService

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/query", response_model=ChatResponse)
async def chat_query(
    payload: ChatRequest,
    service: ChatService = Depends(get_chat_service),
) -> ChatResponse:
    try:
        return await service.ask(
            repository_url=payload.repository_url,
            question=payload.question,
            top_k=payload.top_k,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
