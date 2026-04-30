import asyncio
from typing import Any

from huggingface_hub import InferenceClient

from app.core.config import Settings
from app.models.chat import ChatResponse, ChatSource
from app.services.retrieval import RetrievalService


class ChatService:
    def __init__(self, retrieval_service: RetrievalService, settings: Settings) -> None:
        if not settings.hf_api_token:
            raise ValueError("HF_API_TOKEN is required for RAG endpoints")

        self._retrieval_service = retrieval_service
        self._client = InferenceClient(api_key=settings.hf_api_token)
        self._model = settings.hf_generation_model.strip()
        if not self._model:
            raise ValueError(
                "HF_GENERATION_MODEL is required for RAG chat generation endpoints"
            )
        self._max_new_tokens = settings.hf_max_new_tokens

    async def ask(self, repository_url: str, question: str, top_k: int) -> ChatResponse:
        contexts = await self._retrieval_service.retrieve(
            repository_url=repository_url,
            query=question,
            top_k=top_k,
        )
        if not contexts:
            return ChatResponse(
                answer="No indexed context found for this repository. Index the repository first.",
                sources=[],
                context_chunks=0,
            )

        context_block = "\n\n".join(
            f"[{index + 1}] file={item.path} chunk={item.chunk_index}\n{item.text}"
            for index, item in enumerate(contexts)
        )
        prompt = (
            "You are a repository assistant. Answer the question using only the supplied context. "
            "If the answer is not in context, say you do not have enough context.\n\n"
            f"Question:\n{question}\n\n"
            f"Context:\n{context_block}\n\n"
            "Answer:"
        )

        sources = [
            ChatSource(
                path=item.path,
                score=item.score,
                chunk_index=item.chunk_index,
                preview=item.text[:180].replace("\n", " "),
            )
            for item in contexts
        ]

        try:
            answer = await self._generate_answer(prompt=prompt)
        except Exception as error:
            answer = self._build_fallback_answer(question=question, sources=sources, error=error)

        return ChatResponse(
            answer=answer,
            sources=sources,
            context_chunks=len(contexts),
        )

    def _build_fallback_answer(
        self,
        question: str,
        sources: list[ChatSource],
        error: Exception,
    ) -> str:
        preview_lines = [
            f"- {source.path}: {source.preview}"
            for source in sources[:3]
            if source.preview
        ]
        preview_block = "\n".join(preview_lines) if preview_lines else "- No preview text available."
        return (
            "I found relevant repository context, but the configured Hugging Face generation model "
            "could not produce a final answer. Check `HF_GENERATION_MODEL` and your Hugging Face "
            f"access settings. Original question: {question}\n\n"
            f"Generation error: {error}\n\n"
            f"Relevant snippets:\n{preview_block}"
        )

    async def _generate_answer(self, prompt: str) -> str:
        try:
            raw_answer = await self._generate_with_text_generation(
                prompt=prompt,
                use_model=bool(self._model),
            )
            return self._coerce_answer_text(raw_answer)
        except Exception as text_generation_error:
            if self._is_conversational_task_error(text_generation_error):
                try:
                    return await self._generate_with_chat_completion(prompt=prompt, use_model=True)
                except Exception as chat_error:
                    if self._is_not_chat_model_error(chat_error):
                        return await self._generate_with_text_generation(prompt=prompt, use_model=False)
                    raise

            if self._is_not_text_generation_model_error(text_generation_error):
                return await self._generate_with_chat_completion(prompt=prompt, use_model=False)

            raise

    async def _generate_with_text_generation(self, prompt: str, use_model: bool) -> str:
        kwargs: dict[str, object] = {
            "max_new_tokens": self._max_new_tokens,
            "temperature": 0.2,
            "do_sample": False,
            "return_full_text": False,
        }
        if use_model:
            kwargs["model"] = self._model
        raw_answer = await asyncio.to_thread(
            self._client.text_generation,
            prompt,
            **kwargs,
        )
        return self._coerce_answer_text(raw_answer)

    async def _generate_with_chat_completion(self, prompt: str, use_model: bool) -> str:
        kwargs: dict[str, object] = {
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a repository assistant. "
                        "Answer only from the provided context."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            "max_tokens": self._max_new_tokens,
            "temperature": 0.2,
        }
        if use_model:
            kwargs["model"] = self._model
        raw_chat_answer = await asyncio.to_thread(
            self._client.chat_completion,
            **kwargs,
        )
        return self._extract_chat_answer(raw_chat_answer)

    @staticmethod
    def _coerce_answer_text(raw_answer: object) -> str:
        answer = raw_answer.strip() if isinstance(raw_answer, str) else str(raw_answer).strip()
        if not answer:
            raise ValueError("Generation returned an empty answer")
        return answer

    @staticmethod
    def _is_conversational_task_error(error: Exception) -> bool:
        message = str(error).lower()
        return "supported task: conversational" in message or "task text-generation" in message

    @staticmethod
    def _is_not_chat_model_error(error: Exception) -> bool:
        message = str(error).lower()
        return "not a chat model" in message or "model_not_supported" in message

    @staticmethod
    def _is_not_text_generation_model_error(error: Exception) -> bool:
        message = str(error).lower()
        return (
            "not supported for task text-generation" in message
            or "doesn't support task 'text-generation'" in message
            or "supported task: conversational" in message
        )

    @staticmethod
    def _extract_chat_answer(raw_chat_answer: Any) -> str:
        choices = getattr(raw_chat_answer, "choices", None)
        if isinstance(choices, list) and choices:
            first_choice = choices[0]
            message = getattr(first_choice, "message", None)
            content = getattr(message, "content", None) if message is not None else None
            if isinstance(content, str) and content.strip():
                return content.strip()

        if isinstance(raw_chat_answer, dict):
            raw_choices = raw_chat_answer.get("choices")
            if isinstance(raw_choices, list) and raw_choices:
                first_choice = raw_choices[0]
                if isinstance(first_choice, dict):
                    message = first_choice.get("message")
                    if isinstance(message, dict):
                        content = message.get("content")
                        if isinstance(content, str) and content.strip():
                            return content.strip()

        raise ValueError("Conversational generation returned an invalid response")
