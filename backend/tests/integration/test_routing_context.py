"""Server-side routing choices remain confined to active contexts."""

import unittest
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_engine, get_session
from app.main import create_app
from app.modules.ai_demo.provider import get_provider
from app.modules.identity.models import User
from app.modules.identity.passwords import get_password_hasher
from app.modules.tenancy.models import (
    Role,
    School,
    SchoolMembership,
    SchoolMembershipRole,
    Tenant,
    UserGlobalRole,
)
from app.modules.tenancy.seed_roles import seed_roles

AUTH = "/api/v1/auth"
PASSWORD = "fixture-password-for-tests-42"


class RoutingContextTests(unittest.TestCase):
    def setUp(self) -> None:
        self.connection = get_engine().connect()
        self.transaction = self.connection.begin()
        self.addCleanup(self.connection.close)
        self.addCleanup(self.transaction.rollback)
        self.db = Session(
            bind=self.connection, join_transaction_mode="create_savepoint", expire_on_commit=False
        )
        self.addCleanup(self.db.close)
        seed_roles(self.db)
        app = create_app()

        def test_session():
            with Session(
                bind=self.connection,
                join_transaction_mode="create_savepoint",
                expire_on_commit=False,
            ) as session:
                yield session

        app.dependency_overrides[get_session] = test_session
        self.app = app
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def user(self, *, temporary: bool = False) -> User:
        user = User(
            email=f"routing-{uuid4().hex}@example.invalid",
            password_hash=get_password_hasher().hash(PASSWORD),
            status="ACTIVE",
            must_change_password=temporary,
        )
        self.db.add(user)
        self.db.commit()
        return user

    def school(self) -> School:
        school_id = uuid4()
        self.db.add(Tenant(id=school_id, kind="SCHOOL"))
        self.db.flush()
        school = School(
            id=school_id,
            name=f"School {school_id.hex[:6]}",
            slug=f"school-{school_id.hex}",
            status="ACTIVE",
        )
        self.db.add(school)
        self.db.commit()
        return school

    def school_role(self, user: User, school: School, role: str, status: str = "ACTIVE") -> None:
        membership = self.db.scalar(
            select(SchoolMembership).where(
                SchoolMembership.user_id == user.id, SchoolMembership.school_id == school.id
            )
        )
        if membership is None:
            membership = SchoolMembership(user_id=user.id, school_id=school.id, status=status)
            self.db.add(membership)
            self.db.flush()
        self.db.add(
            SchoolMembershipRole(
                school_id=school.id,
                membership_id=membership.id,
                role_code=role,
                role_scope="SCHOOL",
            )
        )
        self.db.commit()

    def contexts(self, user: User) -> dict:
        login = self.client.post(f"{AUTH}/login", json={"email": user.email, "password": PASSWORD})
        self.assertEqual(login.status_code, 200)
        response = self.client.get(f"{AUTH}/session")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["cache-control"], "no-store")
        self.assertNotIn("access_token", response.text)
        return response.json()

    def test_unauthenticated_and_student_school_only(self) -> None:
        self.assertEqual(self.client.get(f"{AUTH}/session").status_code, 401)
        user, school = self.user(), self.school()
        self.school_role(user, school, "STUDENT")
        data = self.contexts(user)
        self.assertEqual(
            [(c["route"], c["role"]) for c in data["contexts"]], [("/student", "STUDENT")]
        )
        self.assertEqual(data["contexts"][0]["tenant_id"], str(school.id))
        self.assertEqual(data["contexts"][0]["school_id"], str(school.id))

    def test_role_seed_is_idempotent(self) -> None:
        seed_roles(self.db)
        seed_roles(self.db)
        roles = {role.code: role.scope for role in self.db.scalars(select(Role))}
        self.assertEqual(roles["SUPER_ADMIN"], "PLATFORM")
        self.assertEqual(roles["SCHOOL_ADMIN"], "SCHOOL")
        self.assertEqual(roles["TEACHER"], "SCHOOL")
        self.assertEqual(roles["STUDENT"], "SCHOOL")

    def test_teacher_admin_and_super_admin(self) -> None:
        school = self.school()
        for role, route in (("TEACHER", "/teacher"), ("SCHOOL_ADMIN", "/admin")):
            with self.subTest(role=role):
                user = self.user()
                self.school_role(user, school, role)
                self.assertEqual([c["route"] for c in self.contexts(user)["contexts"]], [route])
                self.client.cookies.clear()
        user = self.user()
        self.db.add(UserGlobalRole(user_id=user.id, role_code="SUPER_ADMIN", role_scope="PLATFORM"))
        self.db.commit()
        data = self.contexts(user)
        self.assertEqual(data["global_roles"], ["SUPER_ADMIN"])
        self.assertEqual([c["route"] for c in data["contexts"]], ["/super-admin"])
        self.assertIsNone(data["contexts"][0]["school_id"])

    def test_personal_learner_and_different_roles_in_two_schools(self) -> None:
        personal = self.user()
        self.db.add(Tenant(kind="PERSONAL", owner_user_id=personal.id))
        self.db.commit()
        data = self.contexts(personal)
        self.assertEqual(data["contexts"][0]["type"], "personal")
        self.assertEqual(data["contexts"][0]["route"], "/student")
        self.assertIsNone(data["contexts"][0]["school_id"])
        self.client.cookies.clear()

        user, school_a, school_b = self.user(), self.school(), self.school()
        self.school_role(user, school_a, "TEACHER")
        self.school_role(user, school_b, "SCHOOL_ADMIN")
        data = self.contexts(user)
        by_school = {c["school_id"]: c for c in data["contexts"]}
        self.assertEqual(by_school[str(school_a.id)]["role"], "TEACHER")
        self.assertEqual(by_school[str(school_a.id)]["route"], "/teacher")
        self.assertEqual(by_school[str(school_b.id)]["role"], "SCHOOL_ADMIN")
        self.assertEqual(by_school[str(school_b.id)]["route"], "/admin")
        self.assertEqual(len(by_school), 2)

    def test_inactive_membership_and_school_do_not_leak(self) -> None:
        user, active, inactive = self.user(), self.school(), self.school()
        self.school_role(user, active, "STUDENT")
        self.school_role(user, inactive, "SCHOOL_ADMIN", status="SUSPENDED")
        self.assertEqual(
            [c["school_id"] for c in self.contexts(user)["contexts"]], [str(active.id)]
        )
        self.client.cookies.clear()
        active.status = "SUSPENDED"
        self.db.commit()
        self.assertEqual(self.contexts(user)["contexts"], [])

    def test_password_change_and_logout_invalidate_session(self) -> None:
        user = self.user(temporary=True)
        data = self.contexts(user)
        self.assertTrue(data["must_change_password"])
        response = self.client.post(
            f"{AUTH}/logout",
            headers={"Origin": "http://localhost:3000", "X-Requested-With": "XMLHttpRequest"},
        )
        self.assertEqual(response.status_code, 204)
        self.assertEqual(self.client.get(f"{AUTH}/session").status_code, 401)

    def test_student_demo_conversation_checks_active_context_and_audio(self) -> None:
        class FakeProvider:
            async def reply(self, **kwargs):
                return kwargs.get("text") or "Hello", "Welcome. What would you like?", None

        self.app.dependency_overrides[get_provider] = FakeProvider
        student, school_a, school_b = self.user(), self.school(), self.school()
        self.school_role(student, school_a, "STUDENT")
        context = self.contexts(student)["contexts"][0]["id"]
        token = self.client.post(
            f"{AUTH}/login", json={"email": student.email, "password": PASSWORD}
        ).json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        endpoint = "/api/v1/student/demo/conversation"
        payload = {"context_id": context, "scenario_id": "restaurant", "text": "Hello"}
        valid = self.client.post(endpoint, json=payload, headers=headers)
        self.assertEqual(valid.status_code, 200)
        self.assertEqual(valid.json()["reply"], "Welcome. What would you like?")
        self.assertEqual(valid.headers["cache-control"], "no-store")
        foreign = self.client.post(
            endpoint,
            json={**payload, "context_id": f"school:{school_b.id}:STUDENT"},
            headers=headers,
        )
        self.assertEqual(foreign.status_code, 403)
        malformed = self.client.post(
            endpoint,
            json={**payload, "audio_base64": "invalid!", "audio_mime": "audio/webm"},
            headers=headers,
        )
        self.assertEqual(malformed.status_code, 422)


if __name__ == "__main__":
    unittest.main()
