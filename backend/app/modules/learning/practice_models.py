"""Private practice sets and immutable first submissions owned by learning."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, Timestamps, UUIDPrimaryKey


class PracticeSet(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "learning_practice_sets"
    __table_args__ = (
        UniqueConstraint("tenant_id", "user_id", "course_id", "lesson_id", "revision", "kind"),
        UniqueConstraint("id", "tenant_id", "user_id"),
        CheckConstraint("status IN ('GENERATING', 'READY', 'FAILED')", name="status_valid"),
        CheckConstraint("kind IN ('lesson', 'generated')", name="kind_valid"),
        Index("ix_learning_practice_owner", "tenant_id", "user_id"),
    )
    tenant_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    course_id: Mapped[str] = mapped_column(String(80), nullable=False)
    lesson_id: Mapped[str] = mapped_column(String(80), nullable=False)
    language_code: Mapped[str] = mapped_column(
        String(32), ForeignKey("languages.code"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    revision: Mapped[str] = mapped_column(String(64), nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    source_label: Mapped[str] = mapped_column(String(200), nullable=False)
    questions: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    generation_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    generation_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class PracticeAttempt(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "learning_practice_attempts"
    __table_args__ = (
        ForeignKeyConstraint(
            ["practice_id", "tenant_id", "user_id"],
            [
                "learning_practice_sets.id",
                "learning_practice_sets.tenant_id",
                "learning_practice_sets.user_id",
            ],
        ),
        UniqueConstraint("practice_id", "tenant_id", "user_id"),
        CheckConstraint("score >= 0 AND total > 0 AND score <= total", name="score_valid"),
        Index("ix_learning_attempt_owner_date", "tenant_id", "user_id", "created_at"),
    )
    tenant_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    user_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    practice_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    answers: Mapped[list] = mapped_column(JSONB, nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    total: Mapped[int] = mapped_column(Integer, nullable=False)
