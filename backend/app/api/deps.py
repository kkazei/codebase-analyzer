from functools import lru_cache

from fastapi import Depends

from app.repositories.pinecone_repo import PineconeRepository
from app.services.chat import ChatService
from app.services.embedding import EmbeddingService, get_embedding_service
from app.services.ingestion import IngestionService
from app.services.retrieval import RetrievalService


@lru_cache(maxsize=1)
def get_pinecone_repo() -> PineconeRepository:
    return PineconeRepository()


def get_retrieval_service(
    embedder: EmbeddingService = Depends(get_embedding_service),
    repo: PineconeRepository = Depends(get_pinecone_repo),
) -> RetrievalService:
    return RetrievalService(embedder=embedder, repo=repo)


@lru_cache(maxsize=1)
def get_chat_service() -> ChatService:
    return ChatService()


def get_ingestion_service(
    embedder: EmbeddingService = Depends(get_embedding_service),
    repo: PineconeRepository = Depends(get_pinecone_repo),
) -> IngestionService:
    return IngestionService(embedder=embedder, repo=repo)
