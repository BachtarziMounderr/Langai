"""Small, purpose-bound JWTs; no tenant or permission claims."""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from functools import lru_cache
from hashlib import sha256
from os import environ
from secrets import token_hex
from uuid import UUID

import jwt

ISSUER = "lingua-ai-platform"
AUDIENCE = "lingua-ai-api"


class InvalidToken(Exception):
    """A token failed signature, time, purpose, or claim validation."""


@dataclass(frozen=True)
class AuthSettings:
    secret: str
    access_minutes: int
    refresh_days: int
    frontend_url: str
    secure_cookie: bool


@lru_cache(maxsize=1)
def get_auth_settings() -> AuthSettings:
    secret = environ.get("JWT_SECRET", "")
    if len(secret.encode("utf-8")) < 32:
        raise RuntimeError("JWT_SECRET must contain at least 32 random bytes")
    access_minutes = int(environ.get("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
    refresh_days = int(environ.get("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "14"))
    if not 1 <= access_minutes <= 60 or not 1 <= refresh_days <= 30:
        raise RuntimeError("JWT expiry values are outside the supported range")
    environment = environ.get("ENVIRONMENT", "development")
    frontend_url = environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    if environment != "development" and not frontend_url.startswith("https://"):
        raise RuntimeError("FRONTEND_URL must use HTTPS outside development")
    return AuthSettings(
        secret, access_minutes, refresh_days, frontend_url, environment != "development"
    )


def issue_token(user_id: UUID, session_id: UUID, purpose: str, expires_at: datetime) -> str:
    settings = get_auth_settings()
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "iss": ISSUER,
            "aud": AUDIENCE,
            "sub": str(user_id),
            "sid": str(session_id),
            "type": purpose,
            "jti": token_hex(16),
            "iat": now,
            "exp": expires_at,
        },
        settings.secret,
        algorithm="HS256",
    )


def issue_pair(user_id: UUID, session_id: UUID) -> tuple[str, str, datetime]:
    settings = get_auth_settings()
    now = datetime.now(UTC)
    refresh_expiry = now + timedelta(days=settings.refresh_days)
    return (
        issue_token(
            user_id, session_id, "access", now + timedelta(minutes=settings.access_minutes)
        ),
        issue_token(user_id, session_id, "refresh", refresh_expiry),
        refresh_expiry,
    )


def decode_token(token: str, purpose: str) -> tuple[UUID, UUID]:
    try:
        claims = jwt.decode(
            token,
            get_auth_settings().secret,
            algorithms=["HS256"],
            audience=AUDIENCE,
            issuer=ISSUER,
            options={"require": ["iss", "aud", "sub", "sid", "type", "jti", "iat", "exp"]},
        )
        if claims["type"] != purpose or not isinstance(claims["jti"], str):
            raise InvalidToken
        return UUID(claims["sub"]), UUID(claims["sid"])
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError) as exc:
        raise InvalidToken from exc


def token_digest(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()
