from fastapi.testclient import TestClient

from app.main import app


def test_analyze_rejects_invalid_domain() -> None:
    client = TestClient(app)
    response = client.post(
        "/api/v1/analyze/repository",
        json={"repository_url": "https://example.com/foo/bar", "max_files": 100},
    )

    assert response.status_code == 400
    assert "github.com" in response.json()["detail"]
