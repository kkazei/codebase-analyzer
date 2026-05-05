from __future__ import annotations

import os
import uuid
import zipfile
import asyncio
from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Iterable

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import get_settings
from app.models.ingest import (
    AnalyzeRequest,
    AnalyzeResponse,
    IngestRequest,
    IngestResponse,
)
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

    async def analyze(self, payload: AnalyzeRequest) -> AnalyzeResponse:
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
        file_count = 0
        total_bytes = 0
        top_level_entries: set[str] = set()
        file_paths: list[str] = []

        for file_path in _iter_files(root_dir, settings.ingest_ignored_dirs):
            file_count += 1
            total_bytes += file_path.stat().st_size
            relative_path = str(file_path.relative_to(root_dir))
            root_segment = Path(relative_path).parts[0]
            top_level_entries.add(root_segment)
            if len(file_paths) < 5000:
                file_paths.append(relative_path)

        return AnalyzeResponse(
            repo=f"{owner}/{repo_name}",
            branch=branch,
            file_count=file_count,
            total_bytes=total_bytes,
            top_level_entries=sorted(top_level_entries),
            file_paths=file_paths,
        )

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
        file_list = list(_iter_files(root_dir, settings.ingest_ignored_dirs))
        job_id = payload.job_id or str(uuid.uuid4())
        progress_store.start(job_id=job_id, files_total=len(file_list))
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.ingest_chunk_size,
            chunk_overlap=settings.ingest_chunk_overlap,
        )

        vectors: list[dict] = []
        warnings: list[str] = []
        files_processed = 0
        files_indexed = 0
        chunks_indexed = 0
        top_level_entries: set[str] = set()
        sample_files: list[str] = []
        try:
            for file_path in file_list:
                files_processed += 1
                try:
                    content = file_path.read_text(encoding="utf-8")
                except UnicodeDecodeError:
                    progress_store.update(
                        job_id=job_id,
                        files_processed=files_processed,
                        chunks_indexed=chunks_indexed,
                    )
                    continue

                files_indexed += 1
                relative_path = str(file_path.relative_to(root_dir))
                root_segment = Path(relative_path).parts[0]
                top_level_entries.add(root_segment)
                if len(sample_files) < 40:
                    sample_files.append(relative_path)
                chunks = splitter.split_text(content)
                if chunks:
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
                                    "text": chunk,
                                },
                            }
                        )

                if len(vectors) >= settings.ingest_batch_size:
                    chunks_indexed += await self._flush_vectors(
                        vectors,
                        embed_timeout_sec=settings.ingest_embed_timeout_sec,
                    )
                    vectors = []

                progress_store.update(
                    job_id=job_id,
                    files_processed=files_processed,
                    chunks_indexed=chunks_indexed,
                )

            if vectors:
                chunks_indexed += await self._flush_vectors(
                    vectors,
                    embed_timeout_sec=settings.ingest_embed_timeout_sec,
                )

            progress_store.finish(
                job_id=job_id,
                files_processed=files_processed,
                chunks_indexed=chunks_indexed,
            )

            if files_indexed == 0:
                warnings.append("No indexable text files found.")

            return IngestResponse(
                repo=f"{owner}/{repo_name}",
                branch=branch,
                files_indexed=files_indexed,
                chunks_indexed=chunks_indexed,
                warnings=warnings,
                top_level_entries=sorted(top_level_entries),
                sample_files=sample_files,
                job_id=job_id,
            )
        except Exception:
            progress_store.fail(
                job_id=job_id,
                files_processed=files_processed,
                chunks_indexed=chunks_indexed,
            )
            raise

    async def _flush_vectors(self, vectors: list[dict], embed_timeout_sec: int) -> int:
        if not vectors:
            return 0

        total_indexed = 0
        batch_size = min(len(vectors), 16)
        index_dimension = self._repo.get_dimension()

        for start in range(0, len(vectors), batch_size):
            batch = vectors[start : start + batch_size]
            texts = [vector["metadata"]["text"] for vector in batch]
            embeddings = await asyncio.wait_for(
                self._embedder.embed_batch(texts),
                timeout=embed_timeout_sec,
            )
            if embeddings:
                embedding_dimension = len(embeddings[0])
                if embedding_dimension != index_dimension:
                    raise ValueError(
                        "Embedding dimension does not match Pinecone index dimension. "
                        f"Index={index_dimension}, embedding={embedding_dimension}."
                    )
            for vector, embedding in zip(batch, embeddings, strict=False):
                vector["values"] = embedding

            await self._repo.upsert(batch)
            total_indexed += len(batch)

        return total_indexed


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


@dataclass
class ProgressState:
    job_id: str
    status: str
    files_total: int
    files_processed: int
    chunks_indexed: int


class ProgressStore:
    def __init__(self) -> None:
        self._lock = Lock()
        self._items: dict[str, ProgressState] = {}

    def start(self, job_id: str, files_total: int) -> None:
        with self._lock:
            self._items[job_id] = ProgressState(
                job_id=job_id,
                status="running",
                files_total=files_total,
                files_processed=0,
                chunks_indexed=0,
            )

    def update(self, job_id: str, files_processed: int, chunks_indexed: int) -> None:
        with self._lock:
            state = self._items.get(job_id)
            if not state:
                return
            state.files_processed = files_processed
            state.chunks_indexed = chunks_indexed

    def finish(self, job_id: str, files_processed: int, chunks_indexed: int) -> None:
        with self._lock:
            state = self._items.get(job_id)
            if not state:
                return
            state.files_processed = files_processed
            state.chunks_indexed = chunks_indexed
            state.status = "completed"

    def fail(self, job_id: str, files_processed: int, chunks_indexed: int) -> None:
        with self._lock:
            state = self._items.get(job_id)
            if not state:
                return
            state.files_processed = files_processed
            state.chunks_indexed = chunks_indexed
            state.status = "failed"

    def get(self, job_id: str) -> ProgressState | None:
        with self._lock:
            state = self._items.get(job_id)
            if not state:
                return None
            return ProgressState(
                job_id=state.job_id,
                status=state.status,
                files_total=state.files_total,
                files_processed=state.files_processed,
                chunks_indexed=state.chunks_indexed,
            )


progress_store = ProgressStore()
