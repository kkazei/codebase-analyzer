import pytest

from app.services.github import parse_github_repo_url


@pytest.mark.parametrize(
    ("input_url", "owner", "repo", "branch"),
    [
        ("https://github.com/octocat/Hello-World", "octocat", "Hello-World", None),
        ("github.com/octocat/Hello-World", "octocat", "Hello-World", None),
        (
            "https://github.com/octocat/Hello-World/tree/main",
            "octocat",
            "Hello-World",
            "main",
        ),
    ],
)
def test_parse_github_repo_url(input_url: str, owner: str, repo: str, branch: str | None) -> None:
    parsed_owner, parsed_repo, parsed_branch = parse_github_repo_url(input_url)

    assert parsed_owner == owner
    assert parsed_repo == repo
    assert parsed_branch == branch
