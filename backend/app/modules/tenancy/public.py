"""Public tenancy lookup for active workspace choices."""

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.tenancy.models import (
    Role,
    School,
    SchoolMembership,
    SchoolMembershipRole,
    Tenant,
    UserGlobalRole,
)


@dataclass(frozen=True)
class RoutingContext:
    type: str
    label: str
    tenant_id: UUID | None
    school_id: UUID | None
    role: str


def resolve_routing_contexts(db: Session, user_id: UUID) -> tuple[list[str], list[RoutingContext]]:
    """Return only current, active associations of one global account."""
    global_roles = list(
        db.scalars(
            select(UserGlobalRole.role_code)
            .join(Role, UserGlobalRole.role_code == Role.code)
            .where(UserGlobalRole.user_id == user_id, Role.scope == "PLATFORM")
            .order_by(UserGlobalRole.role_code)
        )
    )
    contexts: list[RoutingContext] = []
    if "SUPER_ADMIN" in global_roles:
        contexts.append(RoutingContext("platform", "Platform", None, None, "SUPER_ADMIN"))
    school_rows = db.execute(
        select(SchoolMembership.school_id, School.name, SchoolMembershipRole.role_code)
        .join(School, School.id == SchoolMembership.school_id)
        .join(Tenant, Tenant.id == School.id)
        .join(
            SchoolMembershipRole,
            (SchoolMembershipRole.school_id == SchoolMembership.school_id)
            & (SchoolMembershipRole.membership_id == SchoolMembership.id),
        )
        .join(Role, Role.code == SchoolMembershipRole.role_code)
        .where(
            SchoolMembership.user_id == user_id,
            SchoolMembership.status == "ACTIVE",
            School.status == "ACTIVE",
            Tenant.kind == "SCHOOL",
            Role.scope == "SCHOOL",
        )
        .order_by(School.name, SchoolMembership.school_id, SchoolMembershipRole.role_code)
    )
    for school_id, school_name, role_code in school_rows:
        if role_code in {"STUDENT", "TEACHER", "SCHOOL_ADMIN"}:
            contexts.append(RoutingContext("school", school_name, school_id, school_id, role_code))

    personal_tenant_id: UUID | None = db.scalar(
        select(Tenant.id).where(Tenant.kind == "PERSONAL", Tenant.owner_user_id == user_id)
    )
    if personal_tenant_id:
        contexts.append(
            RoutingContext("personal", "Personal learning", personal_tenant_id, None, "STUDENT")
        )
    return global_roles, contexts
