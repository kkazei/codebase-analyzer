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

## Deployment Configuration

- Set `VITE_API_BASE_URL` to the deployed backend origin when the frontend and backend use different hosts. Leave it empty when the deployed frontend host reverse-proxies `/api/v1` to FastAPI. This value is embedded when Vite builds, so rebuild the frontend after changing it.
- Set `FRONTEND_ORIGIN` to the deployed frontend origin in the backend environment so FastAPI allows browser requests from that site.
- Set `HF_API_TOKEN` only in the backend environment. It needs Hugging Face Inference Providers access, with Nscale enabled for the recommended `HF_GENERATION_MODEL=Qwen/Qwen2.5-Coder-32B-Instruct:nscale`. Choose a different chat model if Nscale is not enabled for that token.
- Set the Pinecone credentials in the backend environment. Never put Hugging Face or Pinecone secrets in frontend variables.

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
- Frontend app shell with starter home page
- Dockerfiles for frontend and backend
- Compose file with hot-reload mounts for development
