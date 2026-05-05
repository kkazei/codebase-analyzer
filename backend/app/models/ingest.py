from pydantic import BaseModel, Field


class IngestRequest(BaseModel):
    repo_url: str = Field(..., min_length=1, max_length=500)
    branch: str | None = Field(default=None, max_length=200)


class IngestResponse(BaseModel):
    repo: str
    branch: str
    files_indexed: int
    chunks_indexed: int
    warnings: list[str] = Field(default_factory=list)
