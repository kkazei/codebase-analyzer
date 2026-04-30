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
- Frontend app shell with starter home page
- Dockerfiles for frontend and backend
- Compose file with hot-reload mounts for development
