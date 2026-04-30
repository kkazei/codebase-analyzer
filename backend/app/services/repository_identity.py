import re
from urllib.parse import urlparse


def parse_repository_identity(repository_url: str) -> tuple[str, str]:
    parsed = urlparse(repository_url)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("Repository URL must start with http or https")

    if parsed.netloc.lower() != "github.com":
        raise ValueError("Only github.com URLs are supported")

    parts = [part for part in parsed.path.strip("/").split("/") if part]
    if len(parts) < 2:
        raise ValueError("Repository URL must include owner and repository")

    owner = parts[0]
    repo = parts[1].removesuffix(".git")
    if not owner or not repo:
        raise ValueError("Invalid repository URL")

    return owner, repo


def repository_namespace(repository_url: str) -> str:
    owner, repo = parse_repository_identity(repository_url)
    normalized_owner = re.sub(r"[^a-z0-9_-]", "-", owner.lower())
    normalized_repo = re.sub(r"[^a-z0-9_-]", "-", repo.lower())
    return f"{normalized_owner}--{normalized_repo}"
