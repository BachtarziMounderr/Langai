"""Reusable FastAPI authentication guards, without role authorization."""

from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.modules.identity.errors import NOT_AUTHENTICATED, PASSWORD_CHANGE_REQUIRED
from app.modules.identity.models import User
from app.modules.identity.service import current_user

bearer = HTTPBearer(auto_error=False)


def get_authenticated_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    db: Annotated[Session, Depends(get_session)],
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise NOT_AUTHENTICATED
    return current_user(db, credentials.credentials)


def get_current_user(user: Annotated[User, Depends(get_authenticated_user)]) -> User:
    """Default guard for future application routes, including first-login restriction."""
    if user.must_change_password:
        raise PASSWORD_CHANGE_REQUIRED
    return user
