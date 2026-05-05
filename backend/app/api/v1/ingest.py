from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_ingestion_service
from app.models.ingest import (
    AnalyzeRequest,
    AnalyzeResponse,
    IngestRequest,
    IngestResponse,
    ProgressResponse,
)
from app.services.ingestion import IngestionService, progress_store

router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("", response_model=IngestResponse)
async def ingest(
    payload: IngestRequest,
    service: IngestionService = Depends(get_ingestion_service),
) -> IngestResponse:
    try:
        return await service.ingest(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    payload: AnalyzeRequest,
    service: IngestionService = Depends(get_ingestion_service),
) -> AnalyzeResponse:
    try:
        return await service.analyze(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/progress/{job_id}", response_model=ProgressResponse)
async def ingest_progress(job_id: str) -> ProgressResponse:
    state = progress_store.get(job_id)
    if not state:
        raise HTTPException(status_code=404, detail="Ingest job not found.")

    percent = 0
    if state.files_total > 0:
        percent = int(state.files_processed / state.files_total * 100)

    return ProgressResponse(
        job_id=state.job_id,
        status=state.status,
        files_total=state.files_total,
        files_processed=state.files_processed,
        chunks_indexed=state.chunks_indexed,
        percent=percent,
    )
