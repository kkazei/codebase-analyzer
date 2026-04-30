from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import analyze, chat, health, index
from app.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(title=settings.app_name, debug=settings.debug)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_origin_regex=settings.frontend_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, prefix="/api/v1")
    app.include_router(analyze.router, prefix="/api/v1")
    app.include_router(index.router, prefix="/api/v1")
    app.include_router(chat.router, prefix="/api/v1")
    return app


app = create_app()
