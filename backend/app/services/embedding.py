import asyncio
from typing import cast

import torch
from transformers import AutoModel, AutoTokenizer

from app.core.config import Settings


class EmbeddingService:
    _SEGMENT_CHAR_LIMIT = 400
    _SEGMENT_CHAR_OVERLAP = 40

    def __init__(self, settings: Settings) -> None:
        self._model_name = settings.hf_embedding_model
        self._tokenizer = AutoTokenizer.from_pretrained(self._model_name)
        self._model = AutoModel.from_pretrained(self._model_name)
        self._model.eval()

    async def embed(self, text: str) -> list[float]:
        segments = self._segment_text(text)
        if len(segments) == 1:
            return await asyncio.to_thread(self._embed_single_sync, segments[0])

        segment_embeddings = await asyncio.gather(
            *(self._embed_single(segment) for segment in segments)
        )
        return self._mean_pool(segment_embeddings)

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        return await asyncio.gather(*(self.embed(text) for text in texts))

    async def _embed_single(self, text: str) -> list[float]:
        return await asyncio.to_thread(self._embed_single_sync, text)

    def _embed_single_sync(self, text: str) -> list[float]:
        normalized = text.strip()
        if not normalized:
            raise ValueError("Embedding input text cannot be empty")

        encoded = self._tokenizer(
            normalized,
            return_tensors="pt",
            truncation=True,
            max_length=512,
            padding=True,
        )
        with torch.no_grad():
            outputs = self._model(**encoded)

        token_embeddings = outputs.last_hidden_state
        if token_embeddings is None:
            raise ValueError("Embedding model returned an invalid response")
        attention_mask = encoded.get("attention_mask")
        if attention_mask is None:
            raise ValueError("Tokenizer did not return attention_mask")

        pooled = self._mean_pool_last_hidden_state(
            token_embeddings=token_embeddings,
            attention_mask=attention_mask,
        )
        vector = pooled.squeeze(0).tolist()
        return [float(value) for value in cast(list[float], vector)]

    @classmethod
    def _segment_text(cls, text: str) -> list[str]:
        normalized = text.strip()
        if not normalized:
            return [""]
        if len(normalized) <= cls._SEGMENT_CHAR_LIMIT:
            return [normalized]

        segments: list[str] = []
        start = 0
        step = cls._SEGMENT_CHAR_LIMIT - cls._SEGMENT_CHAR_OVERLAP
        while start < len(normalized):
            end = min(start + cls._SEGMENT_CHAR_LIMIT, len(normalized))
            segment = normalized[start:end].strip()
            if segment:
                segments.append(segment)
            if end >= len(normalized):
                break
            start += step
        return segments or [normalized[: cls._SEGMENT_CHAR_LIMIT]]

    @staticmethod
    def _mean_pool(embeddings: list[list[float]]) -> list[float]:
        if not embeddings:
            raise ValueError("Embedding model returned an invalid response")
        dimensions = len(embeddings[0])
        pooled = [0.0] * dimensions
        for embedding in embeddings:
            if len(embedding) != dimensions:
                raise ValueError("Embedding model returned inconsistent dimensions")
            for index, value in enumerate(embedding):
                pooled[index] += value
        count = float(len(embeddings))
        return [value / count for value in pooled]

    @staticmethod
    def _mean_pool_last_hidden_state(
        token_embeddings: torch.Tensor,
        attention_mask: torch.Tensor,
    ) -> torch.Tensor:
        if token_embeddings.ndim != 3:
            raise ValueError("Embedding model returned an invalid response")
        if attention_mask.ndim != 2:
            raise ValueError("Tokenizer returned an invalid attention mask")

        expanded_mask = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        summed = torch.sum(token_embeddings * expanded_mask, dim=1)
        counts = torch.clamp(expanded_mask.sum(dim=1), min=1e-9)
        return summed / counts
