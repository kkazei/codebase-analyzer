import asyncio
from functools import lru_cache

from huggingface_hub import InferenceClient
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone

from app.core.config import get_settings
from app.models.chat import ChatRequest, ChatResponse


@lru_cache(maxsize=1)
def _build_client() -> InferenceClient:
    settings = get_settings()
    if not settings.hf_api_token:
        raise ValueError("HF_API_TOKEN is required for Hugging Face Inference API.")
    return InferenceClient(token=settings.hf_api_token)


class ChatService:
    def __init__(self) -> None:
        settings = get_settings()

        embeddings = HuggingFaceEmbeddings(
            model_name=settings.hf_embedding_model,
            model_kwargs={"device": settings.hf_device},
        )

        client = Pinecone(api_key=settings.pinecone_api_key)
        index = client.Index(settings.pinecone_index_name)
        vector_store = PineconeVectorStore(index=index, embedding=embeddings)

        self._vector_store = vector_store
        self._client = _build_client()
        self._model = settings.hf_generation_model
        self._max_new_tokens = settings.hf_generation_max_new_tokens
        self._temperature = settings.hf_generation_temperature

    async def chat(self, payload: ChatRequest) -> ChatResponse:
        loop = asyncio.get_event_loop()

        filter_payload = payload.filter or None
        documents = await loop.run_in_executor(
            None,
            lambda: self._vector_store.similarity_search(
                payload.question,
                k=4,
                filter=filter_payload,
            ),
        )

        context = "\n\n".join(
            doc.page_content for doc in documents if doc.page_content
        )

        messages = [
            {
                "role": "system",
                "content": (
                    "You are a codebase assistant. Use the context below to answer the question. "
                    "If the context is empty, say you do not have enough information.\n\n"
                    f"Context:\n{context}"
                ),
            },
            {"role": "user", "content": payload.question},
        ]

        response = await loop.run_in_executor(
            None,
            lambda: self._client.chat_completion(
                messages=messages,
                model=self._model,
                max_tokens=self._max_new_tokens,
                temperature=self._temperature,
            ),
        )

        answer = response.choices[0].message.content
        sources = [doc.metadata or {} for doc in documents]
        return ChatResponse(answer=answer.strip(), sources=sources)