import asyncio
from functools import lru_cache
from typing import Any

from langchain.chains.conversational_retrieval.base import (
    ConversationalRetrievalChain,
)
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.llms import HuggingFacePipeline
from langchain_community.vectorstores import Pinecone as LangchainPinecone
from transformers import pipeline as hf_pipeline

from app.core.config import get_settings
from app.models.chat import ChatRequest, ChatResponse


@lru_cache(maxsize=1)
def _build_llm() -> HuggingFacePipeline:
    settings = get_settings()
    pipeline_kwargs: dict[str, Any] = {}
    if settings.hf_api_token:
        pipeline_kwargs["token"] = settings.hf_api_token

    pipe = hf_pipeline(
        "text-generation",
        model=settings.hf_generation_model,
        max_new_tokens=settings.hf_generation_max_new_tokens,
        temperature=settings.hf_generation_temperature,
        device=-1,
        **pipeline_kwargs,
    )

    return HuggingFacePipeline(pipeline=pipe)


class ChatService:
    def __init__(self) -> None:
        settings = get_settings()
        model_kwargs: dict[str, Any] = {}
        if settings.hf_api_token:
            model_kwargs["token"] = settings.hf_api_token

        embeddings = HuggingFaceEmbeddings(
            model_name=settings.hf_embedding_model,
            model_kwargs=model_kwargs or None,
        )

        vector_store = LangchainPinecone.from_existing_index(
            index_name=settings.pinecone_index_name,
            embedding=embeddings,
        )

        self._chain = ConversationalRetrievalChain.from_llm(
            llm=_build_llm(),
            retriever=vector_store.as_retriever(search_kwargs={"k": 4}),
            return_source_documents=True,
        )

    async def chat(self, payload: ChatRequest) -> ChatResponse:
        history = [(turn.user, turn.assistant) for turn in payload.history]
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self._chain.invoke(
                {
                    "question": payload.question,
                    "chat_history": history,
                }
            ),
        )

        sources = []
        for document in result.get("source_documents", []):
            sources.append(document.metadata or {})

        return ChatResponse(
            answer=result.get("answer", ""),
            sources=sources,
        )
