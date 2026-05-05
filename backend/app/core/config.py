from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Codebase Analyzer API"
    debug: bool = False
    frontend_origin: str = "http://localhost:5173"

    pinecone_api_key: str
    pinecone_index_name: str
    pinecone_cloud: str = "aws"
    pinecone_region: str = "us-east-1"

    hf_api_token: str | None = None
    hf_embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    hf_embedding_dimension: int = 384
    hf_device: str = "cpu"

    hf_generation_model: str = "google/flan-t5-base"
    hf_generation_max_new_tokens: int = 256
    hf_generation_temperature: float = 0.7

    github_token: str | None = None
    ingest_max_repo_mb: int = 200
    ingest_chunk_size: int = 1000
    ingest_chunk_overlap: int = 200
    ingest_batch_size: int = 64
    ingest_ignored_dirs: tuple[str, ...] = (
        "node_modules",
        "dist",
        "build",
        "venv",
        ".venv",
        "__pycache__",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
