# codebase-analyzer

AI-powered system for repository analysis with a React frontend and FastAPI backend.

## Why Docker For Collaboration?

Yes, you should use Docker for team collaboration.

- Everyone runs the same runtime versions (Node/Python).
- Setup becomes one command instead of machine-specific dependency fixes.
- You avoid "works on my machine" drift.

Recommended workflow:

- Use Docker Compose as the default team development path.
- Keep local (non-Docker) scripts available for fast solo iteration.

## Project Structure

- frontend: React + TypeScript + Vite + Tailwind
- backend: FastAPI + Pydantic Settings
- docker-compose.yml: Runs both services together

## Initial Setup

1. Copy environment templates:

```powershell
Copy-Item frontend/.env.example frontend/.env
Copy-Item backend/.env.example backend/.env
```

1. Start with Docker:

```powershell
docker compose up --build
```

1. Open apps:

- Frontend: http://localhost:5173
- Backend health: http://localhost:8000/api/v1/health/

## Local (Non-Docker) Setup

Use this if you want faster local loops and already have Python 3.11+ and Node 22+.

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e .[dev]
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

## Useful Commands

```powershell
# run tests
cd backend
pytest

# stop compose stack
docker compose down
```

## What Is Included Right Now

- Backend app factory and CORS setup
- Health endpoint at /api/v1/health/
- Repository analysis endpoint at /api/v1/analyze/repository
- Repository indexing endpoint at /api/v1/index/repository
- RAG chat endpoint at /api/v1/chat/query
- Frontend URL input flow that calls analysis endpoint and renders results
- Frontend indexing + chat flow for repository RAG
- Dockerfiles for frontend and backend
- Compose file with hot-reload mounts for development

## Phase 2: Analyze Public GitHub Repositories

Use the frontend at http://localhost:5173 and submit a URL like:

- https://github.com/tiangolo/fastapi

The backend endpoint accepts:

```json
POST /api/v1/analyze/repository
{
	"repository_url": "https://github.com/owner/repo",
	"max_files": 300
}
```

Example response shape:

```json
{
	"repository": "https://github.com/owner/repo",
	"total_files": 121,
	"total_lines": 8930,
	"top_directories": ["src", "docs"],
	"languages": [{"language": "Python", "files": 113}],
	"summary": "Analyzed 121 files with 8930 lines. Top language: Python."
}
```

The current analyzer now returns:

- A nested repository tree
- Key file previews
- Language and directory breakdowns
- A compact summary of the codebase

That gives us the structure layer we need before adding chunk embeddings and retrieval chat.

## Phase 3: Full RAG (HuggingFace + Pinecone)

Set backend keys in `backend/.env`:

```env
HF_API_TOKEN=your_huggingface_token
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX_NAME=codebase-analyzer
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1
HF_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
HF_GENERATION_MODEL=mistralai/Mistral-7B-Instruct-v0.3
```

### Index a repository

```json
POST /api/v1/index/repository
{
  "repository_url": "https://github.com/owner/repo",
  "max_files": 500,
  "chunk_size": 1200,
  "chunk_overlap": 200
}
```

### Ask repository questions with RAG

```json
POST /api/v1/chat/query
{
  "repository_url": "https://github.com/owner/repo",
  "question": "How is dependency injection wired in this backend?",
  "top_k": 5
}
```
