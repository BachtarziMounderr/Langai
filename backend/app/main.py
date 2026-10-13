"""Minimal FastAPI entry point for local development."""

from os import environ

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.db import models as _models  # noqa: F401 - register referenced ORM tables
from app.modules.ai_demo.routes import router as ai_demo_router
from app.modules.identity.errors import AuthFailure, auth_error_response
from app.modules.identity.routes import router as auth_router
from app.modules.learning.router import router as learning_router
from app.modules.learning.service import LearningFailure


def create_app() -> FastAPI:
    """Build the API; a factory keeps integration tests isolated."""
    application = FastAPI(title="Lingua AI Platform API")
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[environ.get("FRONTEND_URL", "http://localhost:3000")],
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    )
    application.add_exception_handler(AuthFailure, auth_error_response)
    application.include_router(auth_router)
    application.include_router(ai_demo_router)
    application.include_router(learning_router)

    @application.exception_handler(LearningFailure)
    async def learning_error(_request: Request, exc: LearningFailure) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status,
            content={"error": {"code": exc.code, "message": exc.message, "details": {}}},
            headers={"Cache-Control": "no-store"},
        )

    @application.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return application


app = create_app()
