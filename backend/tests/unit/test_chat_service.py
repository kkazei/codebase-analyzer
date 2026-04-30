from dataclasses import dataclass

import pytest

from app.core.config import Settings
from app.services.chat import ChatService


@dataclass
class _RetrievedContext:
    path: str
    score: float
    chunk_index: int
    text: str


class _FakeRetrievalService:
    async def retrieve(
        self,
        repository_url: str,
        query: str,
        top_k: int,
    ) -> list[_RetrievedContext]:
        return [
            _RetrievedContext(
                path="backend/app/main.py",
                score=0.98,
                chunk_index=0,
                text="FastAPI app initialization and router registration live here.",
            )
        ]


class _FailingInferenceClient:
    def text_generation(self, *args: object, **kwargs: object) -> str:
        raise RuntimeError("Upstream generation provider rejected the request")


class _ConversationOnlyInferenceClient:
    def text_generation(self, *args: object, **kwargs: object) -> str:
        raise RuntimeError(
            "Model mistralai/Mistral-7B-Instruct-v0.3 is not supported for task text-generation. "
            "Supported task: conversational."
        )

    def chat_completion(self, *args: object, **kwargs: object) -> dict[str, object]:
        return {
            "choices": [
                {
                    "message": {
                        "content": "Authentication is handled by Firebase permissions checks."
                    }
                }
            ]
        }


class _NotChatModelThenDefaultTextClient:
    def text_generation(self, *args: object, **kwargs: object) -> str:
        if "model" in kwargs:
            raise RuntimeError(
                "(Request ID: x) Bad request: {'message': \"The requested model "
                "'mistralai/Mistral-7B-Instruct-v0.3' is not a chat model.\", "
                "'type': 'invalid_request_error', 'param': 'model', 'code': 'model_not_supported'}"
            )
        return "Authentication is handled via Firebase permissions."

    def chat_completion(self, *args: object, **kwargs: object) -> dict[str, object]:
        raise RuntimeError(
            "(Request ID: y) Bad request: {'message': \"The requested model "
            "'mistralai/Mistral-7B-Instruct-v0.3' is not a chat model.\", "
            "'type': 'invalid_request_error', 'param': 'model', 'code': 'model_not_supported'}"
        )


@pytest.mark.asyncio
async def test_chat_service_returns_fallback_answer_when_generation_fails() -> None:
    settings = Settings(hf_api_token="token")
    service = ChatService(retrieval_service=_FakeRetrievalService(), settings=settings)
    service._client = _FailingInferenceClient()

    response = await service.ask(
        repository_url="https://github.com/example/repo",
        question="How is the FastAPI app wired together?",
        top_k=5,
    )

    assert response.context_chunks == 1
    assert len(response.sources) == 1
    assert "could not produce a final answer" in response.answer
    assert "Upstream generation provider rejected the request" in response.answer


@pytest.mark.asyncio
async def test_chat_service_uses_conversational_fallback() -> None:
    settings = Settings(hf_api_token="token")
    service = ChatService(retrieval_service=_FakeRetrievalService(), settings=settings)
    service._client = _ConversationOnlyInferenceClient()

    response = await service.ask(
        repository_url="https://github.com/example/repo",
        question="How does authentication work?",
        top_k=5,
    )

    assert response.context_chunks == 1
    assert "Firebase permissions checks" in response.answer


@pytest.mark.asyncio
async def test_chat_service_retries_without_model_when_model_is_not_supported() -> None:
    settings = Settings(hf_api_token="token")
    service = ChatService(retrieval_service=_FakeRetrievalService(), settings=settings)
    service._client = _NotChatModelThenDefaultTextClient()

    response = await service.ask(
        repository_url="https://github.com/example/repo",
        question="How does authentication work?",
        top_k=5,
    )

    assert response.context_chunks == 1
    assert "Firebase permissions" in response.answer
