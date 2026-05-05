from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI

from app.services.embedding import get_embedding_service


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    get_embedding_service()
    yield
