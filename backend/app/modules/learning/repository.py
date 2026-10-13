"""Every private read requires a verified tenant and student."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.learning.practice_models import PracticeAttempt, PracticeSet


def owned_practice(
    db: Session, tenant_id: UUID, user_id: UUID, practice_id: UUID
) -> PracticeSet | None:
    return db.scalar(
        select(PracticeSet).where(
            PracticeSet.id == practice_id,
            PracticeSet.tenant_id == tenant_id,
            PracticeSet.user_id == user_id,
        )
    )


def cached_practice(
    db: Session,
    tenant_id: UUID,
    user_id: UUID,
    course_id: str,
    lesson_id: str,
    revision: str,
    kind: str,
) -> PracticeSet | None:
    return db.scalar(
        select(PracticeSet)
        .where(
            PracticeSet.tenant_id == tenant_id,
            PracticeSet.user_id == user_id,
            PracticeSet.course_id == course_id,
            PracticeSet.lesson_id == lesson_id,
            PracticeSet.revision == revision,
            PracticeSet.kind == kind,
        )
        .with_for_update()
    )


def saved_attempt(
    db: Session, tenant_id: UUID, user_id: UUID, practice_id: UUID
) -> PracticeAttempt | None:
    return db.scalar(
        select(PracticeAttempt).where(
            PracticeAttempt.tenant_id == tenant_id,
            PracticeAttempt.user_id == user_id,
            PracticeAttempt.practice_id == practice_id,
        )
    )


def student_attempts(
    db: Session, tenant_id: UUID, user_id: UUID, language_code: str | None
) -> list[tuple[PracticeAttempt, PracticeSet]]:
    query = (
        select(PracticeAttempt, PracticeSet)
        .join(
            PracticeSet,
            (PracticeSet.id == PracticeAttempt.practice_id)
            & (PracticeSet.tenant_id == PracticeAttempt.tenant_id)
            & (PracticeSet.user_id == PracticeAttempt.user_id),
        )
        .where(PracticeAttempt.tenant_id == tenant_id, PracticeAttempt.user_id == user_id)
    )
    if language_code:
        query = query.where(PracticeSet.language_code == language_code)
    return list(db.execute(query.order_by(PracticeAttempt.created_at, PracticeAttempt.id)).tuples())
