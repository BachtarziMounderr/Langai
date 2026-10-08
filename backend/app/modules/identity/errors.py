"""Authentication-only errors with the documented API envelope."""

from fastapi import Request
from fastapi.responses import JSONResponse


class AuthFailure(Exception):
    def __init__(self, status_code: int, code: str, message: str) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message


def auth_error_response(_request: Request, exc: AuthFailure) -> JSONResponse:
    response = JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message, "details": {}}},
    )
    response.headers["Cache-Control"] = "no-store"
    return response


INVALID_CREDENTIALS = AuthFailure(401, "INVALID_CREDENTIALS", "Invalid credentials")
NOT_AUTHENTICATED = AuthFailure(401, "NOT_AUTHENTICATED", "Authentication required")
PASSWORD_CHANGE_REQUIRED = AuthFailure(
    403, "PASSWORD_CHANGE_REQUIRED", "Change your password before continuing"
)
