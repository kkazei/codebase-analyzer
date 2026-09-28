from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_chat_service
from app.models.chat import ChatRequest, ChatResponse
from app.services.chat import ChatInferenceError, ChatService

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    service: ChatService = Depends(get_chat_service),
) -> ChatResponse:
    try:
        return await service.chat(payload)
    except ChatInferenceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
