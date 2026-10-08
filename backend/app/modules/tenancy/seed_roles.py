"""Explicit, idempotent canonical role reference seed."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_session_factory
from app.modules.tenancy.models import Role

ROLES = {
    "SUPER_ADMIN": ("PLATFORM", "Platform administrator"),
    "SCHOOL_ADMIN": ("SCHOOL", "School administrator"),
    "TEACHER": ("SCHOOL", "Teacher"),
    "STUDENT": ("SCHOOL", "Student"),
}


def seed_roles(db: Session) -> None:
    existing = {role.code: role for role in db.scalars(select(Role).where(Role.code.in_(ROLES)))}
    for code, (scope, description) in ROLES.items():
        if code in existing:
            if existing[code].scope != scope:
                raise RuntimeError(f"Role scope mismatch: {code}")
        else:
            db.add(Role(code=code, scope=scope, description=description))
    db.commit()


if __name__ == "__main__":
    with get_session_factory()() as session:
        seed_roles(session)
