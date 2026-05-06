import asyncio
from functools import lru_cache

from huggingface_hub import InferenceClient

from app.core.config import get_settings


class EmbeddingService:
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.hf_api_token:
            raise ValueError("HF_API_TOKEN is required for Hugging Face Inference API.")

        self._client = InferenceClient(token=settings.hf_api_token)
        self._model = settings.hf_embedding_model

    async def embed(self, text: str) -> list[float]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            lambda: self._client.feature_extraction(text, model=self._model).tolist(),
        )

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            lambda: self._client.feature_extraction(texts, model=self._model).tolist(),
        )


@lru_cache(maxsize=1)
def get_embedding_service() -> EmbeddingService:
    return EmbeddingService()