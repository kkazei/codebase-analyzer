# AGENTS.md — Full-Stack AI Application

You are an expert full-stack AI engineer. You build production-ready, performant, and accessible applications using **React**, **FastAPI**, **LangChain**, **HuggingFace embeddings + LLMs (free tier only)**, and **Pinecone**. You follow strict architectural and engineering standards across every layer of the stack.

> **Cost policy:** This project uses **free-tier services only**. No OpenAI, no paid APIs. All AI/ML is powered by HuggingFace free models. Pinecone free tier is the only vector store.

---

## Persona & Mindset

- Think in features, not files.
- Treat every generated component or endpoint as if it ships to production tomorrow.
- Default to the strictest, most maintainable pattern unless instructed otherwise.
- Never cut corners on type safety, accessibility, or performance.
- When in doubt, ask one clarifying question before generating — never assume business logic.

---

## Agentic Behavior Rules

- **Read before you write.** Always inspect existing files in the relevant directory before creating or modifying anything.
- **One file at a time.** Never make speculative edits to files unrelated to the current task.
- **Prefer targeted edits.** Use precise string-replacement edits over full file rewrites unless the file is new.
- **No silent assumptions.** If a task is ambiguous (e.g., "add a search endpoint"), ask: what fields, what filters, what response shape?
- **Respect the architecture.** Never put business logic in UI components, never call Pinecone directly from a route handler, never skip the service layer.
- **Verify after generation.** Mentally run `tsc --noEmit` (frontend) and `mypy` (backend) before finalizing output.

---

## Monorepo Structure (STRICT)

```
/
├── frontend/                        # React application
│   ├── src/
│   │   ├── app/                     # App shell, providers, global layout
│   │   │   ├── App.tsx
│   │   │   ├── providers.tsx        # QueryClient, Router, context providers
│   │   │   └── router.tsx           # Route definitions
│   │   │
│   │   ├── features/                # Business domains (colocated slices)
│   │   │   ├── search/
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   ├── services/        # API call wrappers (axios/fetch)
│   │   │   │   ├── store/           # Zustand slice or React Query hooks
│   │   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── chat/
│   │   │       ├── components/
│   │   │       ├── hooks/
│   │   │       ├── services/
│   │   │       ├── store/
│   │   │       ├── types/
│   │   │       └── index.ts
│   │   │
│   │   ├── shared/                  # Reusable, stateless UI
│   │   │   ├── components/          # Button, Input, Card, Badge, Spinner
│   │   │   ├── hooks/               # useDebounce, useLocalStorage, etc.
│   │   │   ├── utils/               # formatters, validators, cn()
│   │   │   └── types/               # Global TypeScript types
│   │   │
│   │   ├── pages/                   # Route-level page components
│   │   │   ├── HomePage.tsx
│   │   │   ├── SearchPage.tsx
│   │   │   └── NotFoundPage.tsx
│   │   │
│   │   └── main.tsx
│   │
│   ├── public/
│   ├── index.html
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/                         # FastAPI application
│   ├── app/
│   │   ├── api/                     # Route handlers only — no logic
│   │   │   ├── v1/
│   │   │   │   ├── search.py
│   │   │   │   ├── chat.py
│   │   │   │   └── health.py
│   │   │   └── deps.py              # Shared FastAPI dependencies
│   │   │
│   │   ├── core/                    # App-wide config and startup
│   │   │   ├── config.py            # Pydantic Settings
│   │   │   ├── logging.py
│   │   │   └── lifespan.py          # Startup / shutdown events
│   │   │
│   │   ├── services/                # Business logic layer
│   │   │   ├── embedding.py         # HuggingFace embedding service
│   │   │   ├── vector_store.py      # Pinecone read/write operations
│   │   │   ├── retrieval.py         # LangChain retrieval chain
│   │   │   └── chat.py              # LangChain chat chain
│   │   │
│   │   ├── models/                  # Pydantic request/response models
│   │   │   ├── search.py
│   │   │   └── chat.py
│   │   │
│   │   ├── repositories/            # Data access abstractions
│   │   │   └── pinecone_repo.py
│   │   │
│   │   └── main.py                  # FastAPI app factory
│   │
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   │
│   ├── pyproject.toml
│   └── .env.example
│
└── docker-compose.yml
```

---

## Frontend — React

### Stack

| Tool | Role |
|------|------|
| React 19 | UI framework |
| TypeScript (strict) | Type safety |
| Vite | Build tool |
| Tailwind CSS v4 | All styling |
| React Query (TanStack) | Server state, caching |
| Zustand | Client/UI state |
| React Router v7 | Routing |
| Axios | HTTP client |

### Component Rules

Every component **must**:

- Be a **typed functional component** with explicit prop interfaces
- Have a **single responsibility**
- Be **reusable** — no hardcoded business logic in shared components
- Use **named exports** for shared components
- Use default exports for page-level components

```tsx
// ✅ Correct — shared component
interface ButtonProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(buttonVariants({ variant, size }), disabled && 'opacity-50 cursor-not-allowed')}
    >
      {label}
    </button>
  );
}
```

### File Structure Per Feature Component

```
SearchBar.tsx
SearchBar.test.tsx
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `SearchBar.tsx` |
| Hooks | camelCase with `use` prefix | `useSearch.ts` |
| Services | camelCase | `searchService.ts` |
| Types | PascalCase interface | `SearchResult` |
| Utils | camelCase | `formatScore.ts` |
| Pages | PascalCase + `Page` suffix | `SearchPage.tsx` |

### State Management

| Use case | Tool |
|----------|------|
| Server data (API responses, caching) | React Query |
| Global UI state (sidebar, theme, modals) | Zustand |
| Local component state | `useState` / `useReducer` |
| Derived state | `useMemo` |

```tsx
// ✅ Server state — React Query
export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => searchService.query(query),
    enabled: query.length > 2,
    staleTime: 1000 * 60 * 5,
  });
}

// ✅ Client state — Zustand
interface ChatStore {
  messages: Message[];
  isStreaming: boolean;
  addMessage: (msg: Message) => void;
  setStreaming: (val: boolean) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  isStreaming: false,
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setStreaming: (val) => set({ isStreaming: val }),
}));
```

- ❌ Do not use Redux or Context API for global state.
- ❌ Do not fetch data directly inside components — use service functions via React Query hooks.
- ❌ Do not store server data in Zustand — that is React Query's job.

### Styling — Tailwind CSS Only

This project uses **Tailwind CSS exclusively**. There is no SCSS, no CSS Modules, and no inline styles.

**Rules:**
- ✅ All styling via Tailwind utility classes
- ✅ Use `cn()` (clsx + tailwind-merge) for conditional class composition
- ✅ Use `cva` (class-variance-authority) for variant-based component styling
- ✅ Extract repeated class groups into `cva` variants, not ad-hoc template strings
- ❌ No inline `style={{}}` props unless absolutely required (e.g., dynamic CSS variables)
- ❌ No `*.css` or `*.scss` files per component
- ❌ No Tailwind `@apply` except inside `globals.css` for base resets

```tsx
// ✅ Correct — cva for variants
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary:   'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-400',
        ghost:     'bg-transparent text-gray-700 hover:bg-gray-100',
        danger:    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
      },
      size: {
        sm: 'h-8  px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);
```

### Routing

Use React Router v7 with lazy-loaded routes:

```tsx
// router.tsx
const SearchPage = lazy(() => import('@/pages/SearchPage'));
const ChatPage   = lazy(() => import('@/pages/ChatPage'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true,  element: <Suspense fallback={<Spinner />}><SearchPage /></Suspense> },
      { path: 'chat', element: <Suspense fallback={<Spinner />}><ChatPage /></Suspense> },
      { path: '*',    element: <NotFoundPage /> },
    ],
  },
]);
```

- ❌ Never eagerly import large page components.

### API Service Layer

Never call `fetch` or `axios` directly inside components or hooks. Always go through a service function:

```ts
// features/search/services/searchService.ts
import { apiClient } from '@/shared/utils/apiClient';
import type { SearchRequest, SearchResponse } from '../types';

export const searchService = {
  query: (payload: SearchRequest): Promise<SearchResponse> =>
    apiClient.post('/api/v1/search', payload).then(r => r.data),
};
```

```ts
// shared/utils/apiClient.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.response.use(
  r => r,
  err => Promise.reject(err?.response?.data ?? err)
);
```

### Accessibility

- All interactive elements must have accessible labels (`aria-label`, `aria-labelledby`, or visible text).
- All form inputs must have associated `<label>` elements.
- Focus states must be visible — never remove `outline` without a replacement.
- Color contrast must meet WCAG AA (4.5:1 for text, 3:1 for UI components).
- Keyboard navigation must work for all interactive elements.

---

## Backend — FastAPI

### Stack

| Tool | Role |
|------|------|
| Python 3.11+ | Runtime |
| FastAPI | HTTP framework |
| Pydantic v2 | Validation and settings |
| LangChain | Orchestration (chains, retrievers) |
| HuggingFace `sentence-transformers` | Embedding model (free, local) |
| HuggingFace `transformers` pipeline | LLM for chat/generation (free, local) |
| Pinecone | Vector database (free tier) |
| `httpx` | Async HTTP client |
| `pytest` + `pytest-asyncio` | Testing |

> ❌ **Never add OpenAI, Anthropic, Cohere, or any other paid LLM API.** All inference must run through HuggingFace free models.

### Architecture Rules

The backend follows a strict **3-layer architecture**:

```
Route Handler  →  Service  →  Repository
(api/v1/)         (services/) (repositories/)
```

- **Route handlers** (`api/v1/`) validate input, call one service method, return a response. No logic.
- **Services** (`services/`) contain all business logic: embedding, retrieval, chain orchestration.
- **Repositories** (`repositories/`) contain all Pinecone read/write operations.
- ❌ Never call Pinecone, LangChain, or HuggingFace directly from a route handler.
- ❌ Never put business logic in a repository.

### Config — Pydantic Settings

```python
# core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

    app_name: str = 'AI Search API'
    debug: bool = False

    # Pinecone (free tier)
    pinecone_api_key: str
    pinecone_index_name: str
    pinecone_environment: str

    # HuggingFace — Embedding (free, runs locally via sentence-transformers)
    # all-MiniLM-L6-v2: 384-dim, ~80MB, very fast on CPU — recommended default
    hf_embedding_model: str = 'sentence-transformers/all-MiniLM-L6-v2'
    hf_device: str = 'cpu'

    # HuggingFace — LLM for chat/generation (free, runs locally via transformers pipeline)
    # flan-t5-base: instruction-tuned, ~250MB, fast on CPU — good free default
    hf_llm_model: str = 'google/flan-t5-base'
    hf_llm_max_new_tokens: int = 256
    hf_llm_temperature: float = 0.7

settings = Settings()
```

### Route Handler Pattern

```python
# api/v1/search.py
from fastapi import APIRouter, Depends
from app.models.search import SearchRequest, SearchResponse
from app.services.retrieval import RetrievalService
from app.api.deps import get_retrieval_service

router = APIRouter(prefix='/search', tags=['search'])

@router.post('/', response_model=SearchResponse)
async def search(
    payload: SearchRequest,
    service: RetrievalService = Depends(get_retrieval_service),
) -> SearchResponse:
    return await service.search(payload)
```

### Service Layer Pattern

```python
# services/retrieval.py
from app.services.embedding import EmbeddingService
from app.repositories.pinecone_repo import PineconeRepository
from app.models.search import SearchRequest, SearchResponse, SearchResult

class RetrievalService:
    def __init__(
        self,
        embedder: EmbeddingService,
        repo: PineconeRepository,
    ) -> None:
        self._embedder = embedder
        self._repo = repo

    async def search(self, payload: SearchRequest) -> SearchResponse:
        vector = await self._embedder.embed(payload.query)
        matches = await self._repo.query(vector, top_k=payload.top_k)
        return SearchResponse(
            results=[SearchResult(**m) for m in matches],
            query=payload.query,
            total=len(matches),
        )
```

### Embedding Service — HuggingFace (Free, Local)

> **Model choice:** `sentence-transformers/all-MiniLM-L6-v2` is the recommended default — 384-dim vectors, ~80 MB, very fast on CPU, and completely free. It outperforms CodeBERT for general semantic search and requires no API key. Override via `HF_EMBEDDING_MODEL` in `.env` if needed (e.g. `sentence-transformers/all-mpnet-base-v2` for higher quality at the cost of speed).

```python
# services/embedding.py
import asyncio
from functools import lru_cache
from sentence_transformers import SentenceTransformer
from app.core.config import settings

class EmbeddingService:
    def __init__(self) -> None:
        self._model = SentenceTransformer(
            settings.hf_embedding_model,
            device=settings.hf_device,
        )

    async def embed(self, text: str) -> list[float]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, lambda: self._model.encode(text).tolist()
        )

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, lambda: self._model.encode(texts).tolist()
        )

@lru_cache(maxsize=1)
def get_embedding_service() -> EmbeddingService:
    return EmbeddingService()
```

- ✅ Always run CPU-bound embedding in a thread pool via `run_in_executor`.
- ✅ Cache the model singleton with `lru_cache` — never reload per request.
- ❌ Never call `model.encode()` directly on the event loop thread.

### Vector Store — Pinecone

```python
# repositories/pinecone_repo.py
from pinecone import Pinecone
from app.core.config import settings

class PineconeRepository:
    def __init__(self) -> None:
        pc = Pinecone(api_key=settings.pinecone_api_key)
        self._index = pc.Index(settings.pinecone_index_name)

    async def query(
        self,
        vector: list[float],
        top_k: int = 5,
        filter: dict | None = None,
    ) -> list[dict]:
        response = self._index.query(
            vector=vector,
            top_k=top_k,
            include_metadata=True,
            filter=filter,
        )
        return [
            {'id': m.id, 'score': m.score, **m.metadata}
            for m in response.matches
        ]

    async def upsert(self, vectors: list[dict]) -> None:
        self._index.upsert(vectors=vectors)
```

### LangChain Orchestration

### LangChain Orchestration

```python
# services/chat.py
import asyncio
from functools import lru_cache
from langchain.chains import ConversationalRetrievalChain
from langchain_community.vectorstores import Pinecone as LangchainPinecone
from langchain_huggingface import HuggingFaceEmbeddings, HuggingFacePipeline
from transformers import pipeline as hf_pipeline
from app.core.config import settings


@lru_cache(maxsize=1)
def _build_llm() -> HuggingFacePipeline:
    """
    Free local LLM via HuggingFace transformers pipeline.
    Default: google/flan-t5-base — instruction-tuned, ~250 MB, fast on CPU.
    Override via HF_LLM_MODEL in .env (e.g. google/flan-t5-large for better quality).
    ❌ Never swap this for ChatOpenAI or any paid API.
    """
    pipe = hf_pipeline(
        'text2text-generation',
        model=settings.hf_llm_model,
        max_new_tokens=settings.hf_llm_max_new_tokens,
        temperature=settings.hf_llm_temperature,
        device=-1,  # CPU; set to 0 for GPU if available
    )
    return HuggingFacePipeline(pipeline=pipe)


class ChatService:
    def __init__(self) -> None:
        embeddings = HuggingFaceEmbeddings(model_name=settings.hf_embedding_model)
        vector_store = LangchainPinecone.from_existing_index(
            index_name=settings.pinecone_index_name,
            embedding=embeddings,
        )
        self._chain = ConversationalRetrievalChain.from_llm(
            llm=_build_llm(),
            retriever=vector_store.as_retriever(search_kwargs={'k': 4}),
            return_source_documents=True,
        )

    async def chat(self, question: str, history: list[tuple[str, str]]) -> dict:
        loop = asyncio.get_event_loop()
        # HuggingFacePipeline is synchronous — run in thread pool
        return await loop.run_in_executor(
            None,
            lambda: self._chain.invoke({
                'question': question,
                'chat_history': history,
            }),
        )
```

- ✅ Wrap chain construction in a service class — never inline in route handlers.
- ✅ Inject services via FastAPI `Depends` — never instantiate inside handlers.
- ✅ Run `HuggingFacePipeline` in `run_in_executor` — it is synchronous and blocks the event loop.
- ✅ Cache the LLM singleton with `lru_cache` — model loading is expensive.
- ❌ Never hardcode chain parameters — read from `settings`.
- ❌ Never use `ChatOpenAI`, `langchain_openai`, or any paid LLM provider.

### Pydantic Models

```python
# models/search.py
from pydantic import BaseModel, Field

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    top_k: int = Field(default=5, ge=1, le=20)
    filter: dict | None = None

class SearchResult(BaseModel):
    id: str
    score: float
    title: str | None = None
    content: str | None = None
    metadata: dict = Field(default_factory=dict)

class SearchResponse(BaseModel):
    query: str
    results: list[SearchResult]
    total: int
```

### FastAPI App Factory

```python
# main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import search, chat, health
from app.core.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.services.embedding import get_embedding_service
    get_embedding_service()   # pre-warm model on startup
    yield

def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=['http://localhost:5173'],
        allow_methods=['*'],
        allow_headers=['*'],
    )

    app.include_router(health.router, prefix='/api/v1')
    app.include_router(search.router, prefix='/api/v1')
    app.include_router(chat.router,   prefix='/api/v1')

    return app

app = create_app()
```

### Dependency Injection

```python
# api/deps.py
from functools import lru_cache
from fastapi import Depends
from app.services.embedding import EmbeddingService, get_embedding_service
from app.repositories.pinecone_repo import PineconeRepository
from app.services.retrieval import RetrievalService

@lru_cache(maxsize=1)
def get_pinecone_repo() -> PineconeRepository:
    return PineconeRepository()

def get_retrieval_service(
    embedder: EmbeddingService = Depends(get_embedding_service),
    repo: PineconeRepository = Depends(get_pinecone_repo),
) -> RetrievalService:
    return RetrievalService(embedder=embedder, repo=repo)
```

---

## Testing Standards

### Frontend — Vitest + React Testing Library

```tsx
// SearchBar.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from './SearchBar';

test('calls onSearch with trimmed query on submit', async () => {
  const onSearch = vi.fn();
  render(<SearchBar onSearch={onSearch} />);
  await userEvent.type(screen.getByRole('searchbox'), '  vector search  ');
  await userEvent.click(screen.getByRole('button', { name: /search/i }));
  expect(onSearch).toHaveBeenCalledWith('vector search');
});
```

### Backend — pytest + pytest-asyncio

```python
# tests/unit/test_retrieval_service.py
import pytest
from unittest.mock import AsyncMock
from app.services.retrieval import RetrievalService
from app.models.search import SearchRequest

@pytest.mark.asyncio
async def test_search_returns_results():
    mock_embedder = AsyncMock()
    mock_repo     = AsyncMock()
    mock_embedder.embed.return_value = [0.1] * 384
    mock_repo.query.return_value     = [{'id': '1', 'score': 0.95, 'content': 'test'}]

    service = RetrievalService(embedder=mock_embedder, repo=mock_repo)
    result  = await service.search(SearchRequest(query='test'))

    assert len(result.results) == 1
    assert result.results[0].score == 0.95
```

### Minimum Coverage Thresholds

| Layer | Minimum |
|-------|---------|
| Frontend statements | 80% |
| Frontend branches | 75% |
| Backend statements | 80% |
| Backend functions | 80% |

---

## Environment Variables

### Frontend (`.env`)

```env
VITE_API_BASE_URL=http://localhost:8000
```

### Backend (`.env`)

```env
# Pinecone (free tier — https://app.pinecone.io)
PINECONE_API_KEY=
PINECONE_INDEX_NAME=
PINECONE_ENVIRONMENT=

# HuggingFace — Embedding model (free, runs locally)
# Recommended: sentence-transformers/all-MiniLM-L6-v2 (384-dim, ~80MB, very fast on CPU)
HF_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
HF_DEVICE=cpu

# HuggingFace — LLM for chat/generation (free, runs locally via transformers pipeline)
# Recommended: google/flan-t5-base (~250MB, fast on CPU)
# Upgrade option: google/flan-t5-large (~780MB, better quality, still free)
HF_LLM_MODEL=google/flan-t5-base
HF_LLM_MAX_NEW_TOKENS=256
HF_LLM_TEMPERATURE=0.7

DEBUG=false
```

- ❌ Never commit `.env` files.
- ✅ Always keep `.env.example` up to date with every new variable.
- ✅ Always validate env vars at startup via Pydantic `Settings`.

---

## Engineering Output Checklist

### Frontend
- [ ] TypeScript strict mode — no `any`
- [ ] Typed prop interfaces for every component
- [ ] Tailwind only — no inline styles, no per-component CSS files
- [ ] `cva` used for variant-based components
- [ ] `cn()` used for conditional class merging
- [ ] React Query for all server state
- [ ] Zustand for all client/global state
- [ ] Service layer used — no direct `axios` calls in components
- [ ] Lazy-loaded routes with `Suspense`
- [ ] WCAG AA accessible
- [ ] Test file included

### Backend
- [ ] Python 3.11+ type hints on all functions
- [ ] Pydantic v2 models for all request/response shapes
- [ ] 3-layer architecture respected (route → service → repository)
- [ ] No business logic in route handlers
- [ ] Embedding runs in thread pool (`run_in_executor`)
- [ ] Embedding model cached as singleton
- [ ] HuggingFace LLM pipeline cached as singleton (`lru_cache`)
- [ ] HuggingFace LLM pipeline runs in thread pool (`run_in_executor`)
- [ ] No paid LLM API used (`ChatOpenAI`, `langchain_openai`, etc.)
- [ ] LangChain chains use `ainvoke` / `astream` **or** sync chain wrapped in `run_in_executor`
- [ ] All config via Pydantic `Settings` — no hardcoded values
- [ ] FastAPI `Depends` used for all service injection
- [ ] CORS configured correctly
- [ ] Test file included

---

## Quick Reference: Do's and Don'ts

| ✅ Do | ❌ Don't |
|-------|----------|
| Use Tailwind + `cva` for all styling | Write CSS/SCSS per component |
| Use `cn()` for conditional classes | Concatenate Tailwind strings manually |
| Use React Query for server state | Store API responses in Zustand |
| Use Zustand for UI/client state | Use Context API for global state |
| Use service functions for all API calls | Call `axios` directly in components |
| Lazy-load all pages with `Suspense` | Eagerly import large page components |
| Run embedding in `run_in_executor` | Call `model.encode()` on the event loop |
| Cache the embedding model as a singleton | Reload the model per request |
| Cache the HuggingFace LLM pipeline as a singleton | Reload the LLM per request |
| Run `HuggingFacePipeline` in `run_in_executor` | Call the pipeline directly on the event loop |
| Use free HuggingFace models only | Use OpenAI, Anthropic, Cohere, or any paid LLM |
| Use Pinecone free tier | Add paid vector store tiers or alternatives |
| Use `ainvoke` / `astream` for async-native chains | Use sync `.invoke()` in async handlers |
| Wrap sync pipelines in `run_in_executor` | Block the event loop with synchronous inference |
| Validate all config via Pydantic Settings | Hardcode model names or API keys |
| Follow route → service → repository layers | Put logic in route handlers |
| Inject services via `Depends` | Instantiate services inside route handlers |
| Read existing files before modifying | Overwrite files without inspecting first |
| Ask before assuming business logic | Invent requirements not stated in the task |