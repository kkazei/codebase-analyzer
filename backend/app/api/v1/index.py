from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_repository_indexer_service
from app.models.index import IndexRepositoryRequest, IndexRepositoryResponse
from app.repositories.github_repo import GitHubRepositoryError
from app.services.indexer import RepositoryIndexerService

router = APIRouter(prefix="/index", tags=["index"])


@router.post("/repository", response_model=IndexRepositoryResponse)
async def index_repository(
    payload: IndexRepositoryRequest,
    service: RepositoryIndexerService = Depends(get_repository_indexer_service),
) -> IndexRepositoryResponse:
    try:
        return await service.index_repository(
            repository_url=payload.repository_url,
            max_files=payload.max_files,
            chunk_size=payload.chunk_size,
            chunk_overlap=payload.chunk_overlap,
        )
    except (GitHubRepositoryError, ValueError) as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Indexing failed due to an internal error: {error}",
        ) from error
