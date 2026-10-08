"""Global identity and revocable authentication sessions."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, Timestamps, UUIDPrimaryKey


class User(UUIDPrimaryKey, Timestamps, Base):
    """One account across personal and school contexts."""

    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("email <> '' AND email = btrim(email)", name="email_trimmed"),
        CheckConstraint("status IN ('PENDING', 'ACTIVE', 'SUSPENDED')", name="status_valid"),
    )

    email: Mapped[str] = mapped_column(String(320), nullable=False)
    password_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    first_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    must_change_password: Mapped[bool] = mapped_column(
        nullable=False, server_default="false", default=False
    )


class AuthSession(UUIDPrimaryKey, Timestamps, Base):
    """One revocable browser session with only a digest of its current refresh JWT."""

    __tablename__ = "auth_sessions"

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    refresh_token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


Index("ix_auth_sessions_user_active", AuthSession.user_id, AuthSession.revoked_at)


Index("uq_users_email_lower", func.lower(User.email), unique=True)
