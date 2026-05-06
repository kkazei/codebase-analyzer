from contextlib import asynccontextmanager
from typing import AsyncIterator
import logging

from fastapi import FastAPI

from app.services.embedding import get_embedding_service

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    try:
        # Attempt to pre-warm the embedding model, but don't fail startup
        # if the model cannot be downloaded (e.g., network-restricted env).
        get_embedding_service()
    except Exception as exc:  # pragma: no cover - defensive guard
        logger.warning("Embedding model pre-warm failed: %s", exc)
    yield
