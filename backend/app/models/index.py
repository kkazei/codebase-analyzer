from pydantic import BaseModel, Field, model_validator


class IndexRepositoryRequest(BaseModel):
    repository_url: str = Field(..., min_length=1, max_length=500)
    max_files: int = Field(default=500, ge=10, le=5000)
    chunk_size: int = Field(default=1200, ge=200, le=4000)
    chunk_overlap: int = Field(default=200, ge=0, le=1000)

    @model_validator(mode="after")
    def validate_chunk_bounds(self) -> "IndexRepositoryRequest":
        if self.chunk_overlap >= self.chunk_size:
            raise ValueError("chunk_overlap must be smaller than chunk_size")
        return self


class IndexRepositoryResponse(BaseModel):
    repository: str
    namespace: str
    files_indexed: int
    chunks_indexed: int
    summary: str
