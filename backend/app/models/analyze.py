from pydantic import BaseModel, Field


class AnalyzeRepositoryRequest(BaseModel):
    repository_url: str = Field(..., min_length=1, max_length=500)
    max_files: int = Field(default=300, ge=10, le=2000)


class LanguageStat(BaseModel):
    language: str
    files: int


class FileInsight(BaseModel):
    path: str
    language: str
    lines: int
    preview: str


class TreeNode(BaseModel):
    name: str
    kind: str = Field(pattern="^(file|directory)$")
    children: list["TreeNode"] = Field(default_factory=list)


class AnalyzeRepositoryResponse(BaseModel):
    repository: str
    total_files: int
    total_lines: int
    top_directories: list[str]
    languages: list[LanguageStat]
    repository_tree: TreeNode
    key_files: list[FileInsight]
    summary: str
