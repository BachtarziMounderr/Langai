"""Global, school, and class course shells with ordered lessons."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, Timestamps, UUIDPrimaryKey


class Course(UUIDPrimaryKey, Timestamps, Base):
    """Course scope is authoritative; its creator is an audit field only."""

    __tablename__ = "courses"
    __table_args__ = (
        CheckConstraint("scope IN ('GLOBAL', 'SCHOOL', 'CLASS')", name="scope_valid"),
        CheckConstraint("status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')", name="status_valid"),
        CheckConstraint(
            "(scope = 'GLOBAL' AND school_id IS NULL AND class_id IS NULL) OR "
            "(scope = 'SCHOOL' AND school_id IS NOT NULL AND class_id IS NULL) OR "
            "(scope = 'CLASS' AND school_id IS NOT NULL AND class_id IS NOT NULL)",
            name="scope_ownership",
        ),
        ForeignKeyConstraint(
            ["school_id", "class_id"],
            ["classes.school_id", "classes.id"],
            ondelete="RESTRICT",
        ),
        Index("ix_courses_scope_status_language", "scope", "status", "language_code"),
        Index("ix_courses_school_status_language", "school_id", "status", "language_code"),
        Index("ix_courses_school_class_status", "school_id", "class_id", "status"),
    )

    scope: Mapped[str] = mapped_column(String(16), nullable=False)
    school_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("schools.id", ondelete="RESTRICT"), nullable=True
    )
    class_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    language_code: Mapped[str] = mapped_column(
        String(32), ForeignKey("languages.code", ondelete="RESTRICT"), nullable=False
    )
    cefr_code: Mapped[str | None] = mapped_column(
        String(8), ForeignKey("cefr_levels.code", ondelete="RESTRICT"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    created_by_user_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=True
    )
    lessons: Mapped[list[Lesson]] = relationship(back_populates="course", lazy="raise")


class Lesson(UUIDPrimaryKey, Timestamps, Base):
    """Ordered lesson whose visibility is inherited from its course."""

    __tablename__ = "lessons"
    __table_args__ = (
        CheckConstraint("position > 0", name="position_positive"),
        CheckConstraint("status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')", name="status_valid"),
        UniqueConstraint("course_id", "position"),
    )

    course_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("courses.id", ondelete="RESTRICT"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    course: Mapped[Course] = relationship(back_populates="lessons", lazy="raise")
