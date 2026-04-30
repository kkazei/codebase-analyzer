from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

from app.models.analyze import (
    AnalyzeRepositoryResponse,
    FileInsight,
    LanguageStat,
    TreeNode,
)
from app.repositories.github_repo import GitHubRepositoryClient

LANGUAGE_BY_EXTENSION = {
    ".py": "Python",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".json": "JSON",
    ".md": "Markdown",
    ".yml": "YAML",
    ".yaml": "YAML",
    ".toml": "TOML",
    ".go": "Go",
    ".java": "Java",
    ".rs": "Rust",
}


class RepositoryAnalyzerService:
    def __init__(self, github_client: GitHubRepositoryClient) -> None:
        self._github_client = github_client

    async def analyze(self, repository_url: str, max_files: int) -> AnalyzeRepositoryResponse:
        repo_path = await self._github_client.download_public_repository(repository_url)

        file_count = 0
        total_lines = 0
        language_counter: Counter[str] = Counter()
        directory_counter: Counter[str] = Counter()
        key_files: list[FileInsight] = []

        structure_root = _TreeBuilder(name=repo_path.name, kind="directory")

        for file_path in repo_path.rglob("*"):
            if not file_path.is_file() or self._is_hidden(file_path, repo_path):
                continue

            file_count += 1
            if file_count > max_files:
                break

            language = LANGUAGE_BY_EXTENSION.get(file_path.suffix.lower(), "Other")
            language_counter[language] += 1

            rel_path = file_path.relative_to(repo_path)
            structure_root.add_path(rel_path.parts)
            top_directory = rel_path.parts[0] if len(rel_path.parts) > 1 else "<root>"
            directory_counter[top_directory] += 1

            line_count = self._line_count(file_path)
            total_lines += line_count
            if len(key_files) < 12:
                key_files.append(
                    FileInsight(
                        path=str(rel_path).replace("\\", "/"),
                        language=language,
                        lines=line_count,
                        preview=self._preview(file_path),
                    )
                )

        languages = [
            LanguageStat(language=language, files=files)
            for language, files in language_counter.most_common(8)
        ]
        top_directories = [name for name, _ in directory_counter.most_common(6)]

        summary = (
            f"Analyzed {file_count} files with {total_lines} lines. "
            f"Top language: {languages[0].language if languages else 'Unknown'}."
        )

        return AnalyzeRepositoryResponse(
            repository=repository_url,
            total_files=file_count,
            total_lines=total_lines,
            top_directories=top_directories,
            languages=languages,
            repository_tree=structure_root.to_model(),
            key_files=key_files,
            summary=summary,
        )

    @staticmethod
    def _line_count(file_path: Path) -> int:
        try:
            with file_path.open("r", encoding="utf-8", errors="ignore") as file:
                return sum(1 for _ in file)
        except OSError:
            return 0

    @staticmethod
    def _preview(file_path: Path) -> str:
        try:
            with file_path.open("r", encoding="utf-8", errors="ignore") as file:
                lines = [line.rstrip() for _, line in zip(range(6), file)]
        except OSError:
            return ""

        preview = " ".join(part for part in lines if part)
        return preview[:180]

    @staticmethod
    def _is_hidden(file_path: Path, root: Path) -> bool:
        rel_parts = file_path.relative_to(root).parts
        return any(part.startswith(".") for part in rel_parts)


@dataclass
class _TreeBuilder:
    name: str
    kind: str
    children: dict[str, "_TreeBuilder"] = field(default_factory=dict)

    def add_path(self, parts: tuple[str, ...]) -> None:
        if not parts:
            return

        head, *tail = parts
        if not tail:
            self.children.setdefault(head, _TreeBuilder(name=head, kind="file"))
            return

        child = self.children.setdefault(head, _TreeBuilder(name=head, kind="directory"))
        child.add_path(tuple(tail))

    def to_model(self) -> TreeNode:
        ordered_children = sorted(self.children.values(), key=lambda item: (item.kind != "directory", item.name.lower()))
        return TreeNode(
            name=self.name,
            kind=self.kind,
            children=[child.to_model() for child in ordered_children],
        )
