"""Authenticated, context-scoped conversation turn for the student demo."""

import base64
import binascii
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field, model_validator
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.modules.ai_demo.provider import (
    ConversationProvider,
    ProviderError,
    get_provider,
)
from app.modules.identity.dependencies import get_current_user
from app.modules.identity.models import User
from app.modules.tenancy.public import resolve_routing_contexts

router = APIRouter(prefix="/api/v1/student/demo", tags=["student demo"])

SCENARIOS = {
    "restaurant": ("English", "B1", "At the restaurant", "Make a polite request."),
    "hotel": ("English", "B1", "Hotel check-in", "Confirm a reservation."),
    "directions": ("German", "A2", "Asking for directions", "Ask where a place is."),
    "small-talk": ("German", "A2", "First conversation", "Introduce yourself."),
}
MIME_TYPES = {"audio/webm", "audio/mp4", "audio/ogg", "audio/wav"}
MAX_AUDIO_BYTES = 1_500_000


class Turn(BaseModel):
    role: Literal["user", "assistant"]
    text: str = Field(min_length=1, max_length=500)


class ConversationRequest(BaseModel):
    context_id: str = Field(min_length=1, max_length=150)
    scenario_id: str = Field(min_length=1, max_length=80)
    text: str | None = Field(default=None, max_length=500)
    audio_base64: str | None = Field(default=None, max_length=2_100_000)
    audio_mime: str | None = None
    history: list[Turn] = Field(default_factory=list, max_length=6)

    @model_validator(mode="after")
    def validate_input(self) -> "ConversationRequest":
        if not (self.text and self.text.strip()) and not self.audio_base64:
            raise ValueError("A text or voice message is required")
        if self.audio_base64 and self.audio_mime not in MIME_TYPES:
            raise ValueError("Unsupported audio format")
        return self


class ConversationResponse(BaseModel):
    transcript: str
    reply: str
    audio_base64: str | None = None
    audio_mime: str | None = None


@router.post("/conversation", response_model=ConversationResponse)
async def conversation(
    payload: ConversationRequest,
    response: Response,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_session)],
    provider: Annotated[ConversationProvider, Depends(get_provider)],
) -> ConversationResponse:
    response.headers["Cache-Control"] = "no-store"
    _, contexts = resolve_routing_contexts(db, user.id)
    allowed = any(
        item.role == "STUDENT"
        and payload.context_id == f"{item.type}:{item.tenant_id or 'global'}:{item.role}"
        for item in contexts
    )
    if not allowed:
        raise HTTPException(status_code=403, detail="Student context unavailable")
    scenario = SCENARIOS.get(payload.scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario unavailable")
    if payload.audio_base64:
        try:
            audio_bytes = base64.b64decode(payload.audio_base64, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise HTTPException(status_code=422, detail="Invalid audio") from exc
        if not audio_bytes or len(audio_bytes) > MAX_AUDIO_BYTES:
            raise HTTPException(status_code=413, detail="Audio is too large")
    try:
        transcript, answer, audio = await provider.reply(
            language=scenario[0],
            level=scenario[1],
            scenario=scenario[2],
            objective=scenario[3],
            history=[item.model_dump() for item in payload.history],
            text=payload.text,
            audio=payload.audio_base64,
            audio_mime=payload.audio_mime,
        )
    except ProviderError as exc:
        if exc.code == "AI_RATE_LIMITED":
            status = 429
        elif exc.code in {"AI_NOT_CONFIGURED", "AI_ACCESS_DENIED", "AI_MODEL_UNAVAILABLE"}:
            status = 503
        else:
            status = 502
        raise HTTPException(
            status_code=status, detail={"code": exc.code, "message": exc.message}
        ) from exc
    return ConversationResponse(
        transcript=transcript,
        reply=answer,
        audio_base64=audio,
        audio_mime="audio/wav" if audio else None,
    )
