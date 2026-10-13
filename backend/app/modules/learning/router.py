"""Student-only practice and statistics HTTP boundary."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.integrations.lesson_questions import QuestionGenerator, get_question_generator
from app.modules.identity.dependencies import get_current_user
from app.modules.identity.models import User
from app.modules.learning import service
from app.modules.learning.schemas import (
    AttemptCreate,
    AttemptRead,
    PracticeCreate,
    PracticeRead,
    StatisticsRead,
)

router = APIRouter(prefix="/api/v1/student/learning", tags=["student learning"])
DB = Annotated[Session, Depends(get_session)]
Student = Annotated[User, Depends(get_current_user)]


@router.post("/practice-sets", response_model=PracticeRead)
async def practice(
    payload: PracticeCreate,
    response: Response,
    user: Student,
    db: DB,
    generator: Annotated[QuestionGenerator, Depends(get_question_generator)],
) -> PracticeRead:
    response.headers["Cache-Control"] = "no-store"
    return await service.create_practice(db, user.id, payload, generator)


@router.post("/practice-sets/{practice_id}/attempts", response_model=AttemptRead)
def attempt(
    practice_id: UUID, payload: AttemptCreate, response: Response, user: Student, db: DB
) -> AttemptRead:
    response.headers["Cache-Control"] = "no-store"
    return service.submit_attempt(db, user.id, payload.context_id, practice_id, payload.answers)


@router.get("/statistics", response_model=StatisticsRead)
def statistics(
    response: Response,
    user: Student,
    db: DB,
    context_id: Annotated[str, Query(min_length=1, max_length=150)],
    language_code: Annotated[str | None, Query(max_length=32)] = None,
) -> StatisticsRead:
    response.headers["Cache-Control"] = "no-store"
    return service.statistics(db, user.id, context_id, language_code)
