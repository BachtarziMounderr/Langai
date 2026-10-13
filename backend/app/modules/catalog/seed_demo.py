"""Idempotent local catalog seed for the published V2 lesson fixtures."""

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.db import models as _models  # noqa: F401
from app.db.session import get_engine
from app.modules.catalog.models import Language
from app.modules.learning.catalog import LESSONS


def seed_demo_languages(db: Session) -> None:
    """Preserve any existing catalog state; do not enable a disabled language."""
    languages = {item["language_code"]: item["language"] for item in LESSONS}
    for code, name in languages.items():
        db.execute(
            insert(Language)
            .values(code=code, name=name, is_active=True)
            .on_conflict_do_nothing(index_elements=["code"])
        )
    db.commit()


if __name__ == "__main__":
    with Session(get_engine()) as db:
        seed_demo_languages(db)
