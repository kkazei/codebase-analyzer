from dataclasses import dataclass

from app.repositories.pinecone_repo import PineconeRepository
from app.services.embedding import EmbeddingService
from app.services.repository_identity import repository_namespace


@dataclass
class RetrievedContext:
    path: str
    score: float
    chunk_index: int
    text: str


class RetrievalService:
    def __init__(
        self,
        embedding_service: EmbeddingService,
        pinecone_repository: PineconeRepository,
    ) -> None:
        self._embedding_service = embedding_service
        self._pinecone_repository = pinecone_repository

    async def retrieve(
        self,
        repository_url: str,
        query: str,
        top_k: int,
    ) -> list[RetrievedContext]:
        namespace = repository_namespace(repository_url)
        query_embedding = await self._embedding_service.embed(query)
        matches = await self._pinecone_repository.query(
            namespace=namespace,
            vector=query_embedding,
            top_k=top_k,
        )

        contexts: list[RetrievedContext] = []
        for match in matches:
            metadata = match.get("metadata", {})
            contexts.append(
                RetrievedContext(
                    path=str(metadata.get("file_path", "")),
                    score=float(match.get("score", 0.0)),
                    chunk_index=int(metadata.get("chunk_index", 0)),
                    text=str(metadata.get("text", "")),
                )
            )
        return contexts
