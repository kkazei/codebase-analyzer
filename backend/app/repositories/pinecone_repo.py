import asyncio
from typing import Any

from pinecone import Pinecone, ServerlessSpec
from pinecone.exceptions import NotFoundException

from app.core.config import Settings


class PineconeRepository:
    def __init__(self, settings: Settings) -> None:
        if not settings.pinecone_api_key:
            raise ValueError("PINECONE_API_KEY is required for RAG endpoints")

        self._client = Pinecone(api_key=settings.pinecone_api_key)
        self._index_name = settings.pinecone_index_name
        existing_indexes = set(self._client.list_indexes().names())
        if self._index_name not in existing_indexes:
            self._client.create_index(
                name=self._index_name,
                dimension=settings.embedding_dimension,
                metric="cosine",
                spec=ServerlessSpec(
                    cloud=settings.pinecone_cloud,
                    region=settings.pinecone_region,
                ),
            )
        else:
            configured_dimension = settings.embedding_dimension
            actual_dimension = self._get_index_dimension(self._index_name)
            if actual_dimension is not None and actual_dimension != configured_dimension:
                raise ValueError(
                    "Pinecone index dimension mismatch: "
                    f"index '{self._index_name}' is {actual_dimension}, "
                    f"but EMBEDDING_DIMENSION is {configured_dimension}. "
                    "Use a different PINECONE_INDEX_NAME or align EMBEDDING_DIMENSION."
                )
        self._index = self._client.Index(self._index_name)

    def _get_index_dimension(self, index_name: str) -> int | None:
        index_info = self._client.describe_index(index_name)
        if isinstance(index_info, dict):
            dimension = index_info.get("dimension")
            if isinstance(dimension, int):
                return dimension
        dimension = getattr(index_info, "dimension", None)
        if isinstance(dimension, int):
            return dimension
        return None

    async def clear_namespace(self, namespace: str) -> None:
        try:
            await asyncio.to_thread(self._index.delete, delete_all=True, namespace=namespace)
        except NotFoundException:
            return

    async def upsert(self, namespace: str, vectors: list[dict[str, Any]]) -> None:
        if not vectors:
            return
        await asyncio.to_thread(self._index.upsert, vectors=vectors, namespace=namespace)

    async def query(
        self,
        namespace: str,
        vector: list[float],
        top_k: int,
    ) -> list[dict[str, Any]]:
        try:
            result = await asyncio.to_thread(
                self._index.query,
                vector=vector,
                top_k=top_k,
                include_metadata=True,
                namespace=namespace,
            )
        except NotFoundException:
            return []
        return [match.to_dict() for match in result.matches]
