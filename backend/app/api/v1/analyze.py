from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_repository_analyzer_service
from app.models.analyze import AnalyzeRepositoryRequest, AnalyzeRepositoryResponse
from app.repositories.github_repo import GitHubRepositoryError
from app.services.analyzer import RepositoryAnalyzerService

router = APIRouter(prefix="/analyze", tags=["analyze"])


@router.post("/repository", response_model=AnalyzeRepositoryResponse)
async def analyze_repository(
    payload: AnalyzeRepositoryRequest,
    service: RepositoryAnalyzerService = Depends(get_repository_analyzer_service),
) -> AnalyzeRepositoryResponse:
    try:
        return await service.analyze(
            repository_url=payload.repository_url,
            max_files=payload.max_files,
        )
    except GitHubRepositoryError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
