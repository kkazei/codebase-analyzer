import asyncio
import io
import tempfile
import zipfile
from pathlib import Path
from urllib.parse import urlparse

import httpx


class GitHubRepositoryError(Exception):
    pass


class GitHubRepositoryClient:
    async def download_public_repository(self, repository_url: str) -> Path:
        owner, repo = self._parse_owner_repo(repository_url)
        candidate_branches = await self._candidate_branches(owner, repo)

        response: httpx.Response | None = None
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            for branch in candidate_branches:
                archive_url = (
                    f"https://github.com/{owner}/{repo}/archive/refs/heads/{branch}.zip"
                )
                response = await client.get(
                    archive_url,
                    headers={"User-Agent": "codebase-analyzer"},
                )
                if response.status_code == 200:
                    break

        if response is None or response.status_code != 200:
            raise GitHubRepositoryError("Unable to download repository archive")

        temp_root = Path(tempfile.mkdtemp(prefix="repo-analyzer-"))
        await asyncio.to_thread(self._extract_archive, response.content, temp_root)

        extracted_dirs = [item for item in temp_root.iterdir() if item.is_dir()]
        if not extracted_dirs:
            raise GitHubRepositoryError("Repository archive is empty")

        return extracted_dirs[0]

    async def _candidate_branches(self, owner: str, repo: str) -> list[str]:
        branches = ["main", "master"]

        default_branch = await self._get_default_branch(owner, repo)
        if default_branch and default_branch not in branches:
            branches.insert(0, default_branch)

        return branches

    async def _get_default_branch(self, owner: str, repo: str) -> str | None:
        api_url = f"https://api.github.com/repos/{owner}/{repo}"

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                api_url,
                headers={
                    "Accept": "application/vnd.github+json",
                    "User-Agent": "codebase-analyzer",
                },
            )

        if response.status_code != 200:
            return None

        data = response.json()
        branch = data.get("default_branch")
        if not isinstance(branch, str) or not branch:
            return None

        return branch

    def _parse_owner_repo(self, repository_url: str) -> tuple[str, str]:
        parsed = urlparse(repository_url)
        if parsed.scheme not in {"http", "https"}:
            raise GitHubRepositoryError("Repository URL must start with http or https")

        if parsed.netloc.lower() != "github.com":
            raise GitHubRepositoryError("Only github.com URLs are supported")

        parts = [part for part in parsed.path.strip("/").split("/") if part]
        if len(parts) < 2:
            raise GitHubRepositoryError("Repository URL must include owner and repository")

        owner = parts[0]
        repo = parts[1].removesuffix(".git")
        if not owner or not repo:
            raise GitHubRepositoryError("Invalid repository URL")

        return owner, repo

    @staticmethod
    def _extract_archive(content: bytes, destination: Path) -> None:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            archive.extractall(destination)
