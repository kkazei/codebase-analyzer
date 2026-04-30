from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Codebase Analyzer API"
    debug: bool = False
    frontend_origin: str = "http://localhost:5173"
    frontend_origin_regex: str = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
    pinecone_api_key: str = ""
    pinecone_index_name: str = "codebase-analyzer"
    pinecone_cloud: str = "aws"
    pinecone_region: str = "us-east-1"
    hf_api_token: str = ""
    hf_embedding_model: str = "microsoft/codebert-base"
    hf_generation_model: str = ""
    embedding_dimension: int = Field(default=768, ge=128, le=4096)
    rag_chunk_size: int = Field(default=1200, ge=200, le=4000)
    rag_chunk_overlap: int = Field(default=200, ge=0, le=1000)
    rag_top_k: int = Field(default=5, ge=1, le=20)
    hf_max_new_tokens: int = Field(default=400, ge=64, le=2048)

    @field_validator("debug", mode="before")
    @classmethod
    def normalize_debug(cls, value: object) -> object:
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "on"}:
                return True
            if normalized in {"0", "false", "no", "off", "release", "prod", "production"}:
                return False
        return value


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
