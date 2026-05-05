import asyncio
import json
from typing import Any, Iterable

from pinecone import Pinecone

from app.core.config import get_settings


class PineconeRepository:
    def __init__(self) -> None:
        settings = get_settings()
        self._client = Pinecone(api_key=settings.pinecone_api_key)
        self._index_name = settings.pinecone_index_name
        self._index = self._client.Index(self._index_name)
        self._dimension: int | None = None

    def get_dimension(self) -> int:
        if self._dimension is not None:
            return self._dimension

        description = self._client.describe_index(self._index_name)
        dimension = getattr(description, "dimension", None)
        if dimension is None and isinstance(description, dict):
            dimension = description.get("dimension")
        if not dimension:
            raise ValueError("Unable to resolve Pinecone index dimension.")

        self._dimension = int(dimension)
        return self._dimension

    async def query(
        self,
        vector: list[float],
        top_k: int = 5,
        filter: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: self._index.query(
                vector=vector,
                top_k=top_k,
                include_metadata=True,
                filter=filter,
            ),
        )

        return [
            {
                "id": match.id,
                "score": match.score,
                **(match.metadata or {}),
            }
            for match in response.matches
        ]

    async def upsert(self, vectors: list[dict[str, Any]]) -> None:
        loop = asyncio.get_event_loop()
        settings = get_settings()
        for batch in _chunk_vectors_by_size(vectors, settings.pinecone_max_request_bytes):
            await loop.run_in_executor(
                None,
                lambda payload=batch: self._index.upsert(vectors=payload),
            )


def _chunk_vectors_by_size(
    vectors: Iterable[dict[str, Any]],
    max_bytes: int,
) -> list[list[dict[str, Any]]]:
    batches: list[list[dict[str, Any]]] = []
    current_batch: list[dict[str, Any]] = []
    current_size = 0

    for vector in vectors:
        vector_size = _estimate_vector_size(vector)
        if vector_size > max_bytes:
            raise ValueError("Vector exceeds Pinecone request size limit.")

        if current_batch and current_size + vector_size > max_bytes:
            batches.append(current_batch)
            current_batch = [vector]
            current_size = vector_size
        else:
            current_batch.append(vector)
            current_size += vector_size

    if current_batch:
        batches.append(current_batch)

    return batches


def _estimate_vector_size(vector: dict[str, Any]) -> int:
    payload = json.dumps(vector, separators=(",", ":"), ensure_ascii=True)
    return len(payload.encode("utf-8"))
