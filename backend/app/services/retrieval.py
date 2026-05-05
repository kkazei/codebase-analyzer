from app.models.search import SearchRequest, SearchResponse, SearchResult
from app.repositories.pinecone_repo import PineconeRepository
from app.services.embedding import EmbeddingService


class RetrievalService:
    def __init__(
        self,
        embedder: EmbeddingService,
        repo: PineconeRepository,
    ) -> None:
        self._embedder = embedder
        self._repo = repo

    async def search(self, payload: SearchRequest) -> SearchResponse:
        vector = await self._embedder.embed(payload.query)
        matches = await self._repo.query(
            vector,
            top_k=payload.top_k,
            filter=payload.filter,
        )

        return SearchResponse(
            query=payload.query,
            results=[SearchResult(**match) for match in matches],
            total=len(matches),
        )
