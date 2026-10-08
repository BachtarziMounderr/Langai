"""Global language and CEFR references plus school language availability."""

from uuid import UUID

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Integer, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, Timestamps


class Language(Timestamps, Base):
    """Extensible language catalog; no language is hardcoded in the schema."""

    __tablename__ = "languages"
    __table_args__ = (CheckConstraint("code <> '' AND code = lower(code)", name="code_valid"),)

    code: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))


class CEFRLevel(Base):
    """Ordered, extensible reference for proficiency levels."""

    __tablename__ = "cefr_levels"
    __table_args__ = (
        CheckConstraint("rank > 0", name="rank_positive"),
        UniqueConstraint("rank"),
    )

    code: Mapped[str] = mapped_column(String(8), primary_key=True)
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str | None] = mapped_column(String(100), nullable=True)


class SchoolLanguage(Timestamps, Base):
    """A globally available language offered by one school."""

    __tablename__ = "school_languages"

    school_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("schools.id", ondelete="RESTRICT"), primary_key=True
    )
    language_code: Mapped[str] = mapped_column(
        String(32), ForeignKey("languages.code", ondelete="RESTRICT"), primary_key=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
