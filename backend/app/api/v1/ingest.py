from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_ingestion_service
from app.models.ingest import IngestRequest, IngestResponse
from app.services.ingestion import IngestionService

router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("/", response_model=IngestResponse)
async def ingest(
    payload: IngestRequest,
    service: IngestionService = Depends(get_ingestion_service),
) -> IngestResponse:
    try:
        return await service.ingest(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
