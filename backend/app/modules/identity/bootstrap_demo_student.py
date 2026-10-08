"""Create one explicitly requested Student account for a hosted V1 demo."""

import argparse
import re
import sys
from getpass import getpass
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_session_factory
from app.modules.identity.models import User
from app.modules.identity.passwords import get_password_hasher
from app.modules.tenancy.models import (
    Role,
    School,
    SchoolMembership,
    SchoolMembershipRole,
    Tenant,
)


def create_demo_student(
    db: Session, *, email: str, password: str, school_name: str, school_slug: str
) -> None:
    """Make an isolated school and one Student; never create an administrator."""
    email = email.strip().lower()
    school_name = school_name.strip()
    if not email or "@" not in email or len(email) > 320:
        raise ValueError("A valid email address is required")
    if len(password) < 12:
        raise ValueError("Password must contain at least 12 characters")
    if not school_name or len(school_name) > 255:
        raise ValueError("School name is required (maximum 255 characters)")
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", school_slug) or len(school_slug) > 160:
        raise ValueError("School slug must use lowercase letters, numbers and hyphens")
    if db.scalar(select(User.id).where(func.lower(User.email) == email)):
        raise ValueError("Account already exists; no data was changed")
    if db.scalar(select(School.id).where(School.slug == school_slug)):
        raise ValueError("School slug already exists; no data was changed")

    role = db.get(Role, "STUDENT")
    if role is None:
        db.add(Role(code="STUDENT", scope="SCHOOL", description="Student"))
    elif role.scope != "SCHOOL":
        raise ValueError("STUDENT role has an invalid scope")

    school_id = uuid4()
    user = User(
        email=email,
        password_hash=get_password_hasher().hash(password),
        status="ACTIVE",
    )
    db.add_all([Tenant(id=school_id, kind="SCHOOL"), user])
    db.flush()
    db.add(School(id=school_id, name=school_name, slug=school_slug, status="ACTIVE"))
    db.flush()
    membership = SchoolMembership(school_id=school_id, user_id=user.id, status="ACTIVE")
    db.add(membership)
    db.flush()
    db.add(
        SchoolMembershipRole(
            school_id=school_id,
            membership_id=membership.id,
            role_code="STUDENT",
            role_scope="SCHOOL",
        )
    )
    db.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description="Create one hosted V1 demo Student account")
    parser.add_argument("--email", required=True)
    parser.add_argument("--school-name", required=True)
    parser.add_argument("--school-slug", required=True)
    args = parser.parse_args()
    password = getpass("Demo Student password (at least 12 characters): ")
    if password != getpass("Confirm password: "):
        raise SystemExit("Passwords do not match; no data was changed")
    try:
        with get_session_factory()() as db:
            create_demo_student(
                db,
                email=args.email,
                password=password,
                school_name=args.school_name,
                school_slug=args.school_slug,
            )
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc
    sys.stdout.write("Demo Student and school created. No administrator account was created.\n")


if __name__ == "__main__":
    main()
