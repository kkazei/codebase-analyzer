import hashlib
from pathlib import Path

from app.models.index import IndexRepositoryResponse
from app.repositories.github_repo import GitHubRepositoryClient
from app.repositories.pinecone_repo import PineconeRepository
from app.services.analyzer import LANGUAGE_BY_EXTENSION
from app.services.chunker import Chunker
from app.services.embedding import EmbeddingService
from app.services.repository_identity import repository_namespace


class RepositoryIndexerService:
    def __init__(
        self,
        github_client: GitHubRepositoryClient,
        embedding_service: EmbeddingService,
        pinecone_repository: PineconeRepository,
    ) -> None:
        self._github_client = github_client
        self._embedding_service = embedding_service
        self._pinecone_repository = pinecone_repository

    async def index_repository(
        self,
        repository_url: str,
        max_files: int,
        chunk_size: int,
        chunk_overlap: int,
    ) -> IndexRepositoryResponse:
        if chunk_overlap >= chunk_size:
            raise ValueError("chunk_overlap must be smaller than chunk_size")

        namespace = repository_namespace(repository_url)
        repo_path = await self._github_client.download_public_repository(repository_url)
        chunker = Chunker(chunk_size=chunk_size, chunk_overlap=chunk_overlap)

        await self._pinecone_repository.clear_namespace(namespace)

        files_indexed = 0
        chunks_indexed = 0
        pending_vectors: list[dict[str, object]] = []

        for file_path in repo_path.rglob("*"):
            if not file_path.is_file() or self._is_hidden(file_path, repo_path):
                continue
            if files_indexed >= max_files:
                break

            text_content = self._read_text(file_path)
            if not text_content.strip():
                continue

            files_indexed += 1
            relative_path = str(file_path.relative_to(repo_path)).replace("\\", "/")
            language = LANGUAGE_BY_EXTENSION.get(file_path.suffix.lower(), "Other")
            chunks = chunker.chunk_file(
                path=relative_path,
                language=language,
                content=text_content,
            )
            if not chunks:
                continue

            embeddings = await self._embedding_service.embed_batch([chunk.text for chunk in chunks])
            for chunk, embedding in zip(chunks, embeddings, strict=True):
                vector_id = hashlib.sha1(
                    f"{namespace}:{chunk.path}:{chunk.chunk_index}".encode("utf-8")
                ).hexdigest()
                pending_vectors.append(
                    {
                        "id": vector_id,
                        "values": embedding,
                        "metadata": {
                            "repository_url": repository_url,
                            "file_path": chunk.path,
                            "language": chunk.language,
                            "chunk_index": chunk.chunk_index,
                            "text": chunk.text[:4000],
                        },
                    }
                )
            chunks_indexed += len(chunks)

            if len(pending_vectors) >= 50:
                await self._pinecone_repository.upsert(namespace=namespace, vectors=pending_vectors)
                pending_vectors = []

        if pending_vectors:
            await self._pinecone_repository.upsert(namespace=namespace, vectors=pending_vectors)

        return IndexRepositoryResponse(
            repository=repository_url,
            namespace=namespace,
            files_indexed=files_indexed,
            chunks_indexed=chunks_indexed,
            summary=(
                f"Indexed {files_indexed} files into {chunks_indexed} chunks "
                f"under namespace '{namespace}'."
            ),
        )

    @staticmethod
    def _is_hidden(file_path: Path, root: Path) -> bool:
        rel_parts = file_path.relative_to(root).parts
        return any(part.startswith(".") for part in rel_parts)

    @staticmethod
    def _read_text(file_path: Path) -> str:
        try:
            with file_path.open("r", encoding="utf-8", errors="ignore") as file:
                return file.read()
        except OSError:
            return ""
