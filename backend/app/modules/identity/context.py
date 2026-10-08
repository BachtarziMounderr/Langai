"""Adapt verified tenancy choices to the browser session contract."""

from sqlalchemy.orm import Session

from app.modules.identity.models import User
from app.modules.identity.schemas import SessionContext, SessionResponse
from app.modules.tenancy.public import resolve_routing_contexts

ROUTES = {
    "STUDENT": "/student",
    "TEACHER": "/teacher",
    "SCHOOL_ADMIN": "/admin",
    "SUPER_ADMIN": "/super-admin",
}


def session_context(db: Session, user: User) -> SessionResponse:
    """Keep school roles separate and expose no permissions or bearer tokens."""
    global_roles, resolved = resolve_routing_contexts(db, user.id)
    contexts = [
        SessionContext(
            id=f"{item.type}:{item.tenant_id or 'global'}:{item.role}",
            type=item.type,
            label=item.label,
            tenant_id=item.tenant_id,
            school_id=item.school_id,
            role=item.role,
            route=ROUTES[item.role],
        )
        for item in resolved
    ]
    return SessionResponse(
        user=user,
        must_change_password=user.must_change_password,
        global_roles=global_roles,
        contexts=contexts,
    )
