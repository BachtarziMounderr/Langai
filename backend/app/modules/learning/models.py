"""User-language state isolated by tenant, identity, and language."""

from uuid import UUID

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Index, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, Timestamps, UUIDPrimaryKey


class UserLanguageProfile(UUIDPrimaryKey, Timestamps, Base):
    """One contextual language profile shared by paths inside one tenant."""

    __tablename__ = "user_language_profiles"
    __table_args__ = (
        CheckConstraint("status IN ('ACTIVE', 'PAUSED')", name="status_valid"),
        CheckConstraint(
            "initial_level_source IS NULL OR "
            "initial_level_source IN ('SCHOOL', 'PLACEMENT', 'BEGINNER', 'USER')",
            name="initial_source_valid",
        ),
        CheckConstraint(
            "(initial_cefr_code IS NULL AND initial_level_source IS NULL) OR "
            "(initial_cefr_code IS NOT NULL AND initial_level_source IS NOT NULL)",
            name="initial_level_pair",
        ),
        UniqueConstraint("tenant_id", "user_id", "language_code"),
        Index("ix_user_language_profiles_user_tenant", "user_id", "tenant_id"),
    )

    tenant_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="RESTRICT"), nullable=False
    )
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    language_code: Mapped[str] = mapped_column(
        String(32), ForeignKey("languages.code", ondelete="RESTRICT"), nullable=False
    )
    initial_cefr_code: Mapped[str | None] = mapped_column(
        String(8), ForeignKey("cefr_levels.code", ondelete="RESTRICT"), nullable=True
    )
    initial_level_source: Mapped[str | None] = mapped_column(String(16), nullable=True)
    current_cefr_code: Mapped[str | None] = mapped_column(
        String(8), ForeignKey("cefr_levels.code", ondelete="RESTRICT"), nullable=True
    )
    school_path_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    communication_path_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    status: Mapped[str] = mapped_column(String(16), nullable=False)
