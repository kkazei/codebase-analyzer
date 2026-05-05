from __future__ import annotations

import os
import uuid
import zipfile
from pathlib import Path
from typing import Iterable

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import get_settings
from app.models.ingest import IngestRequest, IngestResponse
from app.repositories.pinecone_repo import PineconeRepository
from app.services.embedding import EmbeddingService
from app.services.github import (
    download_repo_zip,
    fetch_repo_metadata,
    parse_github_repo_url,
)


class IngestionService:
    def __init__(self, embedder: EmbeddingService, repo: PineconeRepository) -> None:
        self._embedder = embedder
        self._repo = repo

    async def ingest(self, payload: IngestRequest) -> IngestResponse:
        settings = get_settings()
        owner, repo_name, url_branch = parse_github_repo_url(payload.repo_url)
        metadata = await fetch_repo_metadata(owner, repo_name, settings.github_token)
        branch = payload.branch or url_branch or metadata.get("default_branch")
        if not branch:
            raise ValueError("Unable to resolve repository branch.")

        max_bytes = settings.ingest_max_repo_mb * 1024 * 1024
        zip_path = await download_repo_zip(
            owner=owner,
            repo=repo_name,
            branch=branch,
            token=settings.github_token,
            max_bytes=max_bytes,
        )

        extract_dir = zip_path.parent / "repo"
        extract_dir.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(zip_path, "r") as archive:
            archive.extractall(extract_dir)

        root_dir = next(extract_dir.iterdir())
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.ingest_chunk_size,
            chunk_overlap=settings.ingest_chunk_overlap,
        )

        vectors: list[dict] = []
        warnings: list[str] = []
        files_indexed = 0
        chunks_indexed = 0

        for file_path in _iter_files(root_dir, settings.ingest_ignored_dirs):
            try:
                content = file_path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                continue

            files_indexed += 1
            relative_path = str(file_path.relative_to(root_dir))
            chunks = splitter.split_text(content)
            if not chunks:
                continue

            for index, chunk in enumerate(chunks):
                vectors.append(
                    {
                        "id": str(uuid.uuid4()),
                        "values": None,
                        "metadata": {
                            "repo": f"{owner}/{repo_name}",
                            "repo_url": payload.repo_url,
                            "path": relative_path,
                            "chunk_index": index,
                            "title": relative_path,
                            "content": chunk,
                        },
                    }
                )

            if len(vectors) >= settings.ingest_batch_size:
                chunks_indexed += await self._flush_vectors(vectors)
                vectors = []

        if vectors:
            chunks_indexed += await self._flush_vectors(vectors)

        if files_indexed == 0:
            warnings.append("No indexable text files found.")

        return IngestResponse(
            repo=f"{owner}/{repo_name}",
            branch=branch,
            files_indexed=files_indexed,
            chunks_indexed=chunks_indexed,
            warnings=warnings,
        )

    async def _flush_vectors(self, vectors: list[dict]) -> int:
        texts = [vector["metadata"]["content"] for vector in vectors]
        embeddings = await self._embedder.embed_batch(texts)
        for vector, embedding in zip(vectors, embeddings, strict=False):
            vector["values"] = embedding

        await self._repo.upsert(vectors)
        return len(vectors)


def _iter_files(root: Path, ignored_dirs: Iterable[str]) -> Iterable[Path]:
    ignored_set = set(ignored_dirs)

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [
            name for name in dirnames if name not in ignored_set and not name.startswith(".")
        ]
        for filename in filenames:
            if filename.startswith("."):
                continue
            path = Path(dirpath) / filename
            if _is_binary_file(path):
                continue
            yield path


def _is_binary_file(path: Path) -> bool:
    try:
        with path.open("rb") as handle:
            chunk = handle.read(2048)
            return b"\x00" in chunk
    except OSError:
        return True
