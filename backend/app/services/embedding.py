import asyncio
from functools import lru_cache

from sentence_transformers import SentenceTransformer

from app.core.config import get_settings


class EmbeddingService:
    def __init__(self) -> None:
        settings = get_settings()
        model_kwargs = {}
        if settings.hf_api_token:
            model_kwargs["token"] = settings.hf_api_token

        self._model = SentenceTransformer(
            settings.hf_embedding_model,
            device=settings.hf_device,
            **model_kwargs,
        )

    async def embed(self, text: str) -> list[float]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            lambda: self._model.encode(text).tolist(),
        )

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            lambda: self._model.encode(texts).tolist(),
        )


@lru_cache(maxsize=1)
def get_embedding_service() -> EmbeddingService:
    return EmbeddingService()
