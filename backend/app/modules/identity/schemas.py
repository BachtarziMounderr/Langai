"""Explicit HTTP contracts; password hashes never leave the backend."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=1024)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=1024)
    new_password: str = Field(min_length=12, max_length=1024)


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    must_change_password: bool


class CurrentUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    first_name: str | None
    last_name: str | None
    status: str
    must_change_password: bool


class SessionContext(BaseModel):
    id: str
    type: str
    label: str
    tenant_id: UUID | None = None
    school_id: UUID | None = None
    role: str
    route: str


class SessionResponse(BaseModel):
    user: CurrentUserResponse
    must_change_password: bool
    global_roles: list[str]
    contexts: list[SessionContext]
