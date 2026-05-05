import asyncio
from typing import Any

from pinecone import Pinecone

from app.core.config import get_settings


class PineconeRepository:
    def __init__(self) -> None:
        settings = get_settings()
        client = Pinecone(api_key=settings.pinecone_api_key)
        self._index = client.Index(settings.pinecone_index_name)

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
        await loop.run_in_executor(None, lambda: self._index.upsert(vectors=vectors))
