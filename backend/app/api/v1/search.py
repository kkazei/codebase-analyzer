from fastapi import APIRouter, Depends

from app.api.deps import get_retrieval_service
from app.models.search import SearchRequest, SearchResponse
from app.services.retrieval import RetrievalService

router = APIRouter(prefix="/search", tags=["search"])


@router.post("/", response_model=SearchResponse)
async def search(
    payload: SearchRequest,
    service: RetrievalService = Depends(get_retrieval_service),
) -> SearchResponse:
    return await service.search(payload)
