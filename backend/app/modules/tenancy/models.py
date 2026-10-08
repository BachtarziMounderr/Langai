"""Tenant, school, membership, and persisted authorization structure."""

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
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, Timestamps, UUIDPrimaryKey


class Tenant(UUIDPrimaryKey, Timestamps, Base):
    """Security context for one school or one autonomous learner."""

    __tablename__ = "tenants"
    __table_args__ = (
        CheckConstraint("kind IN ('SCHOOL', 'PERSONAL')", name="kind_valid"),
        CheckConstraint(
            "(kind = 'PERSONAL' AND owner_user_id IS NOT NULL) OR "
            "(kind = 'SCHOOL' AND owner_user_id IS NULL)",
            name="owner_matches_kind",
        ),
        UniqueConstraint("owner_user_id"),
    )

    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    owner_user_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=True
    )
    school: Mapped[School | None] = relationship(back_populates="tenant", lazy="raise")


class School(Timestamps, Base):
    """School extension whose primary key is the SCHOOL tenant ID."""

    __tablename__ = "schools"
    __table_args__ = (
        CheckConstraint("status IN ('ACTIVE', 'SUSPENDED')", name="status_valid"),
        CheckConstraint("slug <> '' AND slug = lower(btrim(slug))", name="slug_normalized"),
        UniqueConstraint("slug"),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="RESTRICT"), primary_key=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(160), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    tenant: Mapped[Tenant] = relationship(back_populates="school", lazy="raise")


class SchoolBranding(Base):
    """Optional school presentation configuration."""

    __tablename__ = "school_branding"

    school_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("schools.id", ondelete="RESTRICT"), primary_key=True
    )
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    primary_color: Mapped[str | None] = mapped_column(String(32), nullable=True)
    secondary_color: Mapped[str | None] = mapped_column(String(32), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class SchoolMembership(UUIDPrimaryKey, Timestamps, Base):
    """A global user belongs to a school through this explicit association."""

    __tablename__ = "school_memberships"
    __table_args__ = (
        CheckConstraint(
            "status IN ('INVITED', 'ACTIVE', 'SUSPENDED', 'LEFT')", name="status_valid"
        ),
        UniqueConstraint("school_id", "user_id"),
        UniqueConstraint("school_id", "id"),
        Index("ix_school_memberships_user_status", "user_id", "status"),
    )

    school_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("schools.id", ondelete="RESTRICT"), nullable=False
    )
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    joined_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Role(Base):
    """Stable PLATFORM or SCHOOL role code."""

    __tablename__ = "roles"
    __table_args__ = (
        CheckConstraint("scope IN ('PLATFORM', 'SCHOOL')", name="scope_valid"),
        UniqueConstraint("code", "scope"),
    )

    code: Mapped[str] = mapped_column(String(64), primary_key=True)
    scope: Mapped[str] = mapped_column(String(16), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)


class Permission(Base):
    """Stable capability code; resource checks remain in future services."""

    __tablename__ = "permissions"
    __table_args__ = (
        CheckConstraint("scope IN ('PLATFORM', 'SCHOOL')", name="scope_valid"),
        UniqueConstraint("code", "scope"),
    )

    code: Mapped[str] = mapped_column(String(128), primary_key=True)
    scope: Mapped[str] = mapped_column(String(16), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)


class RolePermission(Base):
    """Default capability for a role, constrained to the same scope."""

    __tablename__ = "role_permissions"
    __table_args__ = (
        CheckConstraint("scope IN ('PLATFORM', 'SCHOOL')", name="scope_valid"),
        ForeignKeyConstraint(
            ["role_code", "scope"], ["roles.code", "roles.scope"], ondelete="CASCADE"
        ),
        ForeignKeyConstraint(
            ["permission_code", "scope"],
            ["permissions.code", "permissions.scope"],
            ondelete="CASCADE",
        ),
    )

    role_code: Mapped[str] = mapped_column(String(64), primary_key=True)
    permission_code: Mapped[str] = mapped_column(String(128), primary_key=True)
    scope: Mapped[str] = mapped_column(String(16), nullable=False)


class UserGlobalRole(Base):
    """Global role assignment, limited by a composite PLATFORM-role FK."""

    __tablename__ = "user_global_roles"
    __table_args__ = (
        CheckConstraint("role_scope = 'PLATFORM'", name="platform_role_only"),
        ForeignKeyConstraint(
            ["role_code", "role_scope"], ["roles.code", "roles.scope"], ondelete="RESTRICT"
        ),
        Index("ix_user_global_roles_role_user", "role_code", "user_id"),
    )

    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), primary_key=True
    )
    role_code: Mapped[str] = mapped_column(String(64), primary_key=True)
    role_scope: Mapped[str] = mapped_column(
        String(16), nullable=False, server_default=text("'PLATFORM'")
    )
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class SchoolMembershipRole(Base):
    """A school membership can hold one or more SCHOOL roles."""

    __tablename__ = "school_membership_roles"
    __table_args__ = (
        CheckConstraint("role_scope = 'SCHOOL'", name="school_role_only"),
        ForeignKeyConstraint(
            ["school_id", "membership_id"],
            ["school_memberships.school_id", "school_memberships.id"],
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["role_code", "role_scope"], ["roles.code", "roles.scope"], ondelete="RESTRICT"
        ),
        Index(
            "ix_school_membership_roles_school_role_member",
            "school_id",
            "role_code",
            "membership_id",
        ),
    )

    school_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    membership_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    role_code: Mapped[str] = mapped_column(String(64), primary_key=True)
    role_scope: Mapped[str] = mapped_column(
        String(16), nullable=False, server_default=text("'SCHOOL'")
    )
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class SchoolMembershipPermissionGrant(Base):
    """Positive, school-scoped exceptional capability on a membership."""

    __tablename__ = "school_membership_permission_grants"
    __table_args__ = (
        CheckConstraint("permission_scope = 'SCHOOL'", name="school_permission_only"),
        ForeignKeyConstraint(
            ["school_id", "membership_id"],
            ["school_memberships.school_id", "school_memberships.id"],
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["permission_code", "permission_scope"],
            ["permissions.code", "permissions.scope"],
            ondelete="RESTRICT",
        ),
    )

    school_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    membership_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    permission_code: Mapped[str] = mapped_column(String(128), primary_key=True)
    permission_scope: Mapped[str] = mapped_column(
        String(16), nullable=False, server_default=text("'SCHOOL'")
    )
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
