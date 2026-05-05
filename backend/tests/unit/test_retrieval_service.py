from unittest.mock import AsyncMock

import pytest

from app.models.search import SearchRequest
from app.services.retrieval import RetrievalService


@pytest.mark.asyncio
async def test_search_returns_results() -> None:
    mock_embedder = AsyncMock()
    mock_repo = AsyncMock()
    mock_embedder.embed.return_value = [0.1] * 768
    mock_repo.query.return_value = [
        {"id": "file-1", "score": 0.92, "title": "Doc", "content": "Body"}
    ]

    service = RetrievalService(embedder=mock_embedder, repo=mock_repo)
    result = await service.search(SearchRequest(query="test"))

    assert result.total == 1
    assert result.results[0].id == "file-1"
