from __future__ import annotations

import tempfile
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx


def parse_github_repo_url(repo_url: str) -> tuple[str, str, str | None]:
    normalized = repo_url.strip()
    if not normalized.startswith("http"):
        normalized = f"https://{normalized}"

    parsed = urlparse(normalized)
    if parsed.netloc not in {"github.com", "www.github.com"}:
        raise ValueError("Only github.com repositories are supported.")

    parts = [segment for segment in parsed.path.split("/") if segment]
    if len(parts) < 2:
        raise ValueError("Repository URL must include owner and repo name.")

    owner = parts[0]
    repo = parts[1].removesuffix(".git")
    branch = None

    if len(parts) >= 4 and parts[2] == "tree":
        branch = parts[3]

    return owner, repo, branch


async def fetch_repo_metadata(
    owner: str,
    repo: str,
    token: str | None,
) -> dict[str, Any]:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "codebase-analyzer",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    url = f"https://api.github.com/repos/{owner}/{repo}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()
        return response.json()


async def download_repo_zip(
    owner: str,
    repo: str,
    branch: str,
    token: str | None,
    max_bytes: int,
) -> Path:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "codebase-analyzer",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    url = f"https://api.github.com/repos/{owner}/{repo}/zipball/{branch}"
    temp_dir = Path(tempfile.mkdtemp())
    zip_path = temp_dir / "repo.zip"

    async with httpx.AsyncClient(timeout=None, follow_redirects=True) as client:
        async with client.stream("GET", url, headers=headers) as response:
            response.raise_for_status()
            content_length = response.headers.get("Content-Length")
            if content_length and int(content_length) > max_bytes:
                raise ValueError("Repository archive exceeds size limit.")

            downloaded = 0
            with zip_path.open("wb") as handle:
                async for chunk in response.aiter_bytes():
                    downloaded += len(chunk)
                    if downloaded > max_bytes:
                        raise ValueError("Repository archive exceeds size limit.")
                    handle.write(chunk)

    return zip_path
