"""Minimal browser authentication endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.modules.identity.context import session_context
from app.modules.identity.dependencies import get_authenticated_user
from app.modules.identity.errors import NOT_AUTHENTICATED, AuthFailure
from app.modules.identity.models import User
from app.modules.identity.schemas import (
    AccessTokenResponse,
    ChangePasswordRequest,
    CurrentUserResponse,
    LoginRequest,
    SessionResponse,
)
from app.modules.identity.service import (
    authenticate,
    change_password,
    revoke_refresh,
    rotate_refresh,
    user_from_refresh,
)
from app.modules.identity.tokens import get_auth_settings

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
REFRESH_COOKIE = "lingua_refresh"


def _check_browser_request(request: Request) -> None:
    """Origin plus non-simple header protect cookie-authenticated POSTs."""
    settings = get_auth_settings()
    if (
        request.headers.get("origin") != settings.frontend_url
        or request.headers.get("x-requested-with") != "XMLHttpRequest"
    ):
        raise AuthFailure(403, "CSRF_REJECTED", "Request origin rejected")


def _set_refresh_cookie(response: Response, token: str) -> None:
    settings = get_auth_settings()
    response.delete_cookie(REFRESH_COOKIE, path="/api/v1/auth")
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=token,
        max_age=settings.refresh_days * 86400,
        path="/",
        secure=settings.secure_cookie,
        httponly=True,
        samesite="lax",
    )
    response.headers["Cache-Control"] = "no-store"


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(REFRESH_COOKIE, path="/api/v1/auth")
    response.delete_cookie(
        REFRESH_COOKIE,
        path="/",
        secure=get_auth_settings().secure_cookie,
        httponly=True,
        samesite="lax",
    )
    response.delete_cookie("lingua_context", path="/", samesite="lax")
    response.headers["Cache-Control"] = "no-store"


def _access_response(user: User, access: str) -> AccessTokenResponse:
    return AccessTokenResponse(
        access_token=access,
        expires_in=get_auth_settings().access_minutes * 60,
        must_change_password=user.must_change_password,
    )


@router.post("/login", response_model=AccessTokenResponse)
def login(
    payload: LoginRequest, response: Response, db: Annotated[Session, Depends(get_session)]
) -> AccessTokenResponse:
    user, access, refresh = authenticate(db, payload.email, payload.password)
    _set_refresh_cookie(response, refresh)
    return _access_response(user, access)


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh(
    request: Request, response: Response, db: Annotated[Session, Depends(get_session)]
) -> AccessTokenResponse:
    _check_browser_request(request)
    token = request.cookies.get(REFRESH_COOKIE)
    if token is None:
        raise NOT_AUTHENTICATED
    user, access, new_refresh = rotate_refresh(db, token)
    _set_refresh_cookie(response, new_refresh)
    return _access_response(user, access)


@router.post("/logout", status_code=204)
def logout(
    request: Request, response: Response, db: Annotated[Session, Depends(get_session)]
) -> None:
    _check_browser_request(request)
    revoke_refresh(db, request.cookies.get(REFRESH_COOKIE))
    _clear_refresh_cookie(response)


@router.post("/change-password", status_code=204)
def change_own_password(
    payload: ChangePasswordRequest,
    response: Response,
    user: Annotated[User, Depends(get_authenticated_user)],
    db: Annotated[Session, Depends(get_session)],
) -> None:
    change_password(db, user, payload.current_password, payload.new_password)
    _clear_refresh_cookie(response)


@router.get("/me", response_model=CurrentUserResponse)
def me(user: Annotated[User, Depends(get_authenticated_user)], response: Response) -> User:
    response.headers["Cache-Control"] = "no-store"
    return user


@router.get("/session", response_model=SessionResponse)
def browser_session(
    request: Request, response: Response, db: Annotated[Session, Depends(get_session)]
) -> SessionResponse:
    """Read-only cookie bootstrap for server rendering; no token is returned."""
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise NOT_AUTHENTICATED
    user = user_from_refresh(db, token)
    response.headers["Cache-Control"] = "no-store"
    return session_context(db, user)
