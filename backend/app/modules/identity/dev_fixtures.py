"""Explicit development fixture accounts; secrets are supplied interactively."""

import argparse
from getpass import getpass
from os import environ
from sys import stdout
from uuid import uuid4

from sqlalchemy import select

from app.db.session import get_session_factory
from app.modules.identity.models import User
from app.modules.identity.passwords import get_password_hasher
from app.modules.tenancy.models import (
    School,
    SchoolMembership,
    SchoolMembershipRole,
    Tenant,
    UserGlobalRole,
)
from app.modules.tenancy.seed_roles import seed_roles

DEV_DOMAIN = "lingua-dev.invalid"


def main() -> None:
    if environ.get("ENVIRONMENT") != "development":
        raise SystemExit("Fixtures require ENVIRONMENT=development")
    parser = argparse.ArgumentParser(description="Create development routing accounts")
    parser.add_argument("--reset-passwords", action="store_true")
    args = parser.parse_args()
    password = getpass("Shared local fixture password (at least 12 characters): ").removesuffix(
        "\r"
    )
    if len(password) < 12:
        raise SystemExit("Password must contain at least 12 characters")
    with get_session_factory()() as db:
        seed_roles(db)
        fixture_emails = [
            f"dev-{role}@{DEV_DOMAIN}"
            for role in ("student", "teacher", "admin", "super-admin", "multi", "personal")
        ]
        existing = list(db.scalars(select(User).where(User.email.in_(fixture_emails))))
        if args.reset_passwords:
            if len(existing) != len(fixture_emails):
                raise SystemExit("Expected all six DEV fixture accounts; no account was changed")
            for user in existing:
                user.password_hash = get_password_hasher().hash(password)
            db.commit()
            stdout.write("Six DEV fixture passwords updated.\n")
            return
        if existing:
            raise SystemExit("Fixtures already exist; no account was changed")
        school_a_id, school_b_id = uuid4(), uuid4()
        db.add_all(
            [
                Tenant(id=school_a_id, kind="SCHOOL"),
                Tenant(id=school_b_id, kind="SCHOOL"),
            ]
        )
        db.flush()
        db.add_all(
            [
                School(
                    id=school_a_id,
                    name="DEV School A",
                    slug=f"dev-a-{school_a_id.hex[:8]}",
                    status="ACTIVE",
                ),
                School(
                    id=school_b_id,
                    name="DEV School B",
                    slug=f"dev-b-{school_b_id.hex[:8]}",
                    status="ACTIVE",
                ),
            ]
        )
        users = {}
        for role in ("student", "teacher", "admin", "super-admin", "multi", "personal"):
            user = User(
                email=f"dev-{role}@{DEV_DOMAIN}",
                password_hash=get_password_hasher().hash(password),
                status="ACTIVE",
            )
            db.add(user)
            users[role] = user
        db.flush()
        for name, school_id, role_code in (
            ("student", school_a_id, "STUDENT"),
            ("teacher", school_a_id, "TEACHER"),
            ("admin", school_a_id, "SCHOOL_ADMIN"),
            ("multi", school_a_id, "TEACHER"),
            ("multi", school_b_id, "SCHOOL_ADMIN"),
        ):
            membership = SchoolMembership(
                school_id=school_id, user_id=users[name].id, status="ACTIVE"
            )
            db.add(membership)
            db.flush()
            db.add(
                SchoolMembershipRole(
                    school_id=school_id,
                    membership_id=membership.id,
                    role_code=role_code,
                    role_scope="SCHOOL",
                )
            )
        db.add(
            UserGlobalRole(
                user_id=users["super-admin"].id, role_code="SUPER_ADMIN", role_scope="PLATFORM"
            )
        )
        db.add(Tenant(kind="PERSONAL", owner_user_id=users["personal"].id))
        db.commit()
    for email in fixture_emails:
        stdout.write(f"{email}\n")


if __name__ == "__main__":
    main()
