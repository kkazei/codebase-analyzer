from functools import lru_cache

from fastapi import HTTPException

from app.core.config import Settings, get_settings
from app.repositories.github_repo import GitHubRepositoryClient
from app.repositories.pinecone_repo import PineconeRepository
from app.services.chat import ChatService
from app.services.analyzer import RepositoryAnalyzerService
from app.services.embedding import EmbeddingService
from app.services.indexer import RepositoryIndexerService
from app.services.retrieval import RetrievalService


@lru_cache(maxsize=1)
def get_github_repository_client() -> GitHubRepositoryClient:
    return GitHubRepositoryClient()


@lru_cache(maxsize=1)
def get_repository_analyzer_service() -> RepositoryAnalyzerService:
    client = get_github_repository_client()
    return RepositoryAnalyzerService(github_client=client)


@lru_cache(maxsize=1)
def get_embedding_service() -> EmbeddingService:
    try:
        settings = get_settings()
        return EmbeddingService(settings=settings)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@lru_cache(maxsize=1)
def get_pinecone_repository() -> PineconeRepository:
    try:
        settings: Settings = get_settings()
        return PineconeRepository(settings=settings)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@lru_cache(maxsize=1)
def get_repository_indexer_service() -> RepositoryIndexerService:
    github_client = get_github_repository_client()
    embedding_service = get_embedding_service()
    pinecone_repository = get_pinecone_repository()
    return RepositoryIndexerService(
        github_client=github_client,
        embedding_service=embedding_service,
        pinecone_repository=pinecone_repository,
    )


@lru_cache(maxsize=1)
def get_retrieval_service() -> RetrievalService:
    embedding_service = get_embedding_service()
    pinecone_repository = get_pinecone_repository()
    return RetrievalService(
        embedding_service=embedding_service,
        pinecone_repository=pinecone_repository,
    )


@lru_cache(maxsize=1)
def get_chat_service() -> ChatService:
    try:
        settings = get_settings()
        retrieval_service = get_retrieval_service()
        return ChatService(retrieval_service=retrieval_service, settings=settings)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
