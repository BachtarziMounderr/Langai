"""Explicit development-only account creation; never assigns an admin role."""

import argparse
from getpass import getpass
from os import environ
from sys import stdout

from sqlalchemy import func, select

from app.db.session import get_session_factory
from app.modules.identity.models import User
from app.modules.identity.passwords import get_password_hasher


def main() -> None:
    if environ.get("ENVIRONMENT") != "development":
        raise SystemExit("This command is restricted to ENVIRONMENT=development")
    parser = argparse.ArgumentParser(description="Create one development-only login account")
    parser.add_argument("--email", required=True)
    parser.add_argument("--temporary", action="store_true")
    args = parser.parse_args()
    email = args.email.strip().lower()
    if not email or "@" not in email or len(email) > 320:
        raise SystemExit("A valid email address is required")
    password = getpass("Password (at least 12 characters): ")
    if len(password) < 12:
        raise SystemExit("Password must contain at least 12 characters")

    with get_session_factory()() as db:
        if db.scalar(select(User.id).where(func.lower(User.email) == email)):
            raise SystemExit("Account already exists; credentials were not changed")
        db.add(
            User(
                email=email,
                password_hash=get_password_hasher().hash(password),
                status="ACTIVE",
                must_change_password=args.temporary,
            )
        )
        db.commit()
    stdout.write("Development account created without roles or school memberships.\n")


if __name__ == "__main__":
    main()
