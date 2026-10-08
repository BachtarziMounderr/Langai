"""School-scoped classes, groups, enrollments, and teacher assignments."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, Timestamps, UUIDPrimaryKey


class SchoolClass(UUIDPrimaryKey, Timestamps, Base):
    """A class belongs to exactly one school."""

    __tablename__ = "classes"
    __table_args__ = (
        CheckConstraint("status IN ('ACTIVE', 'ARCHIVED')", name="status_valid"),
        UniqueConstraint("school_id", "id"),
        Index("ix_classes_school_status", "school_id", "status"),
    )

    school_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("schools.id", ondelete="RESTRICT"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    groups: Mapped[list[SchoolGroup]] = relationship(back_populates="school_class", lazy="raise")


class SchoolGroup(UUIDPrimaryKey, Timestamps, Base):
    """A group is provisionally a child of one class in the same school."""

    __tablename__ = "groups"
    __table_args__ = (
        CheckConstraint("status IN ('ACTIVE', 'ARCHIVED')", name="status_valid"),
        ForeignKeyConstraint(
            ["school_id", "class_id"],
            ["classes.school_id", "classes.id"],
            ondelete="RESTRICT",
        ),
        UniqueConstraint("school_id", "class_id", "name"),
        UniqueConstraint("school_id", "class_id", "id"),
    )

    school_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    class_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    school_class: Mapped[SchoolClass] = relationship(back_populates="groups", lazy="raise")


class ClassEnrollment(UUIDPrimaryKey, Timestamps, Base):
    """Student membership enrolled in a class of the same school."""

    __tablename__ = "class_enrollments"
    __table_args__ = (
        CheckConstraint("status IN ('ACTIVE', 'ENDED')", name="status_valid"),
        ForeignKeyConstraint(
            ["school_id", "class_id"],
            ["classes.school_id", "classes.id"],
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["school_id", "student_membership_id"],
            ["school_memberships.school_id", "school_memberships.id"],
            ondelete="RESTRICT",
        ),
        UniqueConstraint("school_id", "class_id", "student_membership_id"),
        UniqueConstraint("school_id", "class_id", "id"),
        Index(
            "ix_class_enrollments_school_student_status",
            "school_id",
            "student_membership_id",
            "status",
        ),
    )

    school_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    class_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    student_membership_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class GroupEnrollment(Base):
    """Join a class enrollment to a group of that exact class and school."""

    __tablename__ = "group_enrollments"
    __table_args__ = (
        ForeignKeyConstraint(
            ["school_id", "class_id", "group_id"],
            ["groups.school_id", "groups.class_id", "groups.id"],
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["school_id", "class_id", "class_enrollment_id"],
            ["class_enrollments.school_id", "class_enrollments.class_id", "class_enrollments.id"],
            ondelete="RESTRICT",
        ),
        Index(
            "ix_group_enrollments_school_class_enrollment",
            "school_id",
            "class_id",
            "class_enrollment_id",
        ),
    )

    school_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    class_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    group_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    class_enrollment_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class TeacherClassAssignment(Base):
    """Teacher membership assigned to a class of the same school."""

    __tablename__ = "teacher_class_assignments"
    __table_args__ = (
        CheckConstraint("status IN ('ACTIVE', 'ENDED')", name="status_valid"),
        ForeignKeyConstraint(
            ["school_id", "class_id"],
            ["classes.school_id", "classes.id"],
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["school_id", "teacher_membership_id"],
            ["school_memberships.school_id", "school_memberships.id"],
            ondelete="RESTRICT",
        ),
        Index(
            "ix_teacher_class_assignments_school_teacher_status",
            "school_id",
            "teacher_membership_id",
            "status",
        ),
    )

    school_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    class_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    teacher_membership_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    status: Mapped[str] = mapped_column(String(16), nullable=False)
