"""Authentication use cases and their transaction boundaries."""

from datetime import UTC, datetime
from hmac import compare_digest
from uuid import uuid4

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.modules.identity.errors import INVALID_CREDENTIALS, NOT_AUTHENTICATED, AuthFailure
from app.modules.identity.models import AuthSession, User
from app.modules.identity.passwords import dummy_password_hash, get_password_hasher
from app.modules.identity.tokens import (
    InvalidToken,
    decode_token,
    issue_pair,
    token_digest,
)


def authenticate(db: Session, email: str, password: str) -> tuple[User, str, str]:
    """Verify credentials and create one revocable refresh session."""
    user = db.scalar(select(User).where(func.lower(User.email) == email.strip().lower()))
    encoded = user.password_hash if user and user.password_hash else dummy_password_hash()
    valid = get_password_hasher().verify(encoded, password)
    if not user or not valid or user.status != "ACTIVE" or not user.password_hash:
        raise INVALID_CREDENTIALS

    if get_password_hasher().needs_rehash(user.password_hash):
        user.password_hash = get_password_hasher().hash(password)

    session_id = uuid4()
    access, refresh, expires_at = issue_pair(user.id, session_id)
    auth_session = AuthSession(
        id=session_id,
        user_id=user.id,
        refresh_token_hash=token_digest(refresh),
        expires_at=expires_at,
    )
    db.add(auth_session)
    db.commit()
    return user, access, refresh


def current_user(db: Session, access_token: str) -> User:
    """Recheck account and session state for every protected request."""
    try:
        user_id, session_id = decode_token(access_token, "access")
    except InvalidToken as exc:
        raise NOT_AUTHENTICATED from exc
    auth_session = db.get(AuthSession, session_id)
    user = db.get(User, user_id)
    if (
        auth_session is None
        or user is None
        or auth_session.user_id != user_id
        or auth_session.revoked_at is not None
        or auth_session.expires_at <= datetime.now(UTC)
        or user.status != "ACTIVE"
    ):
        raise NOT_AUTHENTICATED
    return user


def user_from_refresh(db: Session, refresh_token: str) -> User:
    """Read a live browser session without rotating its refresh token."""
    try:
        user_id, session_id = decode_token(refresh_token, "refresh")
    except InvalidToken as exc:
        raise NOT_AUTHENTICATED from exc
    auth_session = db.get(AuthSession, session_id)
    user = db.get(User, user_id)
    if (
        auth_session is None
        or user is None
        or auth_session.user_id != user_id
        or auth_session.revoked_at is not None
        or auth_session.expires_at <= datetime.now(UTC)
        or user.status != "ACTIVE"
        or not compare_digest(auth_session.refresh_token_hash, token_digest(refresh_token))
    ):
        raise NOT_AUTHENTICATED
    return user


def rotate_refresh(db: Session, refresh_token: str) -> tuple[User, str, str]:
    """Rotate under a row lock; a reused predecessor revokes its session."""
    try:
        user_id, session_id = decode_token(refresh_token, "refresh")
    except InvalidToken as exc:
        raise NOT_AUTHENTICATED from exc

    auth_session = db.scalar(
        select(AuthSession).where(AuthSession.id == session_id).with_for_update()
    )
    if auth_session is None or auth_session.user_id != user_id:
        raise NOT_AUTHENTICATED
    if auth_session.revoked_at is not None or auth_session.expires_at <= datetime.now(UTC):
        raise NOT_AUTHENTICATED
    if not compare_digest(auth_session.refresh_token_hash, token_digest(refresh_token)):
        auth_session.revoked_at = datetime.now(UTC)
        db.commit()
        raise NOT_AUTHENTICATED

    user = db.get(User, user_id)
    if user is None or user.status != "ACTIVE":
        auth_session.revoked_at = datetime.now(UTC)
        db.commit()
        raise NOT_AUTHENTICATED

    access, new_refresh, expires_at = issue_pair(user_id, session_id)
    auth_session.refresh_token_hash = token_digest(new_refresh)
    auth_session.expires_at = expires_at
    db.commit()
    return user, access, new_refresh


def revoke_refresh(db: Session, refresh_token: str | None) -> None:
    """Make logout idempotent while invalidating a recognized browser session."""
    if not refresh_token:
        return
    try:
        user_id, session_id = decode_token(refresh_token, "refresh")
    except InvalidToken:
        return
    auth_session = db.scalar(
        select(AuthSession).where(AuthSession.id == session_id).with_for_update()
    )
    if auth_session and auth_session.user_id == user_id and auth_session.revoked_at is None:
        auth_session.revoked_at = datetime.now(UTC)
        db.commit()


def change_password(db: Session, user: User, current: str, replacement: str) -> None:
    """Change the credential and revoke every session for the global account."""
    if not user.password_hash or not get_password_hasher().verify(user.password_hash, current):
        raise INVALID_CREDENTIALS
    if current == replacement:
        raise AuthFailure(400, "PASSWORD_UNCHANGED", "Choose a different password")
    user.password_hash = get_password_hasher().hash(replacement)
    user.must_change_password = False
    db.execute(
        update(AuthSession)
        .where(AuthSession.user_id == user.id, AuthSession.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )
    db.commit()
