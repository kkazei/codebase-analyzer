from pydantic import BaseModel, Field


class IngestRequest(BaseModel):
    repo_url: str = Field(..., min_length=1, max_length=500)
    branch: str | None = Field(default=None, max_length=200)
    job_id: str | None = Field(default=None, max_length=100)


class IngestResponse(BaseModel):
    repo: str
    branch: str
    files_indexed: int
    chunks_indexed: int
    warnings: list[str] = Field(default_factory=list)
    top_level_entries: list[str] = Field(default_factory=list)
    sample_files: list[str] = Field(default_factory=list)
    job_id: str


class AnalyzeRequest(BaseModel):
    repo_url: str = Field(..., min_length=1, max_length=500)
    branch: str | None = Field(default=None, max_length=200)


class AnalyzeResponse(BaseModel):
    repo: str
    branch: str
    file_count: int
    total_bytes: int
    top_level_entries: list[str] = Field(default_factory=list)
    file_paths: list[str] = Field(default_factory=list)


class ProgressResponse(BaseModel):
    job_id: str
    status: str
    files_total: int
    files_processed: int
    chunks_indexed: int
    percent: int
