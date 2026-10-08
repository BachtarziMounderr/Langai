"""PostgreSQL constraints that protect the first tenant-aware schema."""

import unittest
from uuid import UUID, uuid4

from sqlalchemy import insert, inspect
from sqlalchemy.exc import IntegrityError

from app.db.session import get_engine
from app.modules.identity.models import User
from app.modules.schools.models import ClassEnrollment, SchoolClass, TeacherClassAssignment
from app.modules.tenancy.models import School, SchoolMembership, Tenant


class DatabaseConstraintTests(unittest.TestCase):
    """Each test rolls back every fixture row, including failed inserts."""

    def setUp(self) -> None:
        self.connection = get_engine().connect()
        self.transaction = self.connection.begin()
        self.addCleanup(self.connection.close)
        self.addCleanup(self.transaction.rollback)

    def _user(self, email: str) -> UUID:
        user_id = uuid4()
        self.connection.execute(insert(User).values(id=user_id, email=email, status="ACTIVE"))
        return user_id

    def _school(self, slug: str) -> UUID:
        school_id = uuid4()
        self.connection.execute(insert(Tenant).values(id=school_id, kind="SCHOOL"))
        self.connection.execute(
            insert(School).values(id=school_id, name=slug, slug=slug, status="ACTIVE")
        )
        return school_id

    def _membership(self, school_id: UUID, user_id: UUID) -> UUID:
        membership_id = uuid4()
        self.connection.execute(
            insert(SchoolMembership).values(
                id=membership_id, school_id=school_id, user_id=user_id, status="ACTIVE"
            )
        )
        return membership_id

    def test_schema_has_core_and_authentication_tables(self) -> None:
        expected = {
            "users",
            "tenants",
            "schools",
            "school_branding",
            "school_memberships",
            "roles",
            "permissions",
            "role_permissions",
            "user_global_roles",
            "school_membership_roles",
            "school_membership_permission_grants",
            "classes",
            "groups",
            "class_enrollments",
            "group_enrollments",
            "teacher_class_assignments",
            "languages",
            "cefr_levels",
            "school_languages",
            "user_language_profiles",
            "courses",
            "lessons",
            "auth_sessions",
        }
        self.assertEqual(
            expected, set(inspect(self.connection).get_table_names()) - {"alembic_version"}
        )

    def test_email_is_unique_without_case_sensitivity(self) -> None:
        self._user("Alice@example.org")
        with self.assertRaises(IntegrityError), self.connection.begin_nested():
            self._user("alice@example.org")

    def test_membership_is_unique_for_one_user_and_school(self) -> None:
        user_id = self._user("member@example.org")
        school_id = self._school("unique-membership")
        self._membership(school_id, user_id)
        with self.assertRaises(IntegrityError), self.connection.begin_nested():
            self._membership(school_id, user_id)

    def test_enrollment_rejects_membership_from_another_school(self) -> None:
        school_a = self._school("school-a")
        school_b = self._school("school-b")
        member_b = self._membership(school_b, self._user("student-b@example.org"))
        class_a = uuid4()
        self.connection.execute(
            insert(SchoolClass).values(
                id=class_a, school_id=school_a, name="Class A", status="ACTIVE"
            )
        )
        with self.assertRaises(IntegrityError), self.connection.begin_nested():
            self.connection.execute(
                insert(ClassEnrollment).values(
                    id=uuid4(),
                    school_id=school_a,
                    class_id=class_a,
                    student_membership_id=member_b,
                    status="ACTIVE",
                )
            )

    def test_assignment_rejects_teacher_from_another_school(self) -> None:
        school_a = self._school("assignment-a")
        school_b = self._school("assignment-b")
        teacher_b = self._membership(school_b, self._user("teacher-b@example.org"))
        class_a = uuid4()
        self.connection.execute(
            insert(SchoolClass).values(
                id=class_a, school_id=school_a, name="Class A", status="ACTIVE"
            )
        )
        with self.assertRaises(IntegrityError), self.connection.begin_nested():
            self.connection.execute(
                insert(TeacherClassAssignment).values(
                    school_id=school_a,
                    class_id=class_a,
                    teacher_membership_id=teacher_b,
                    status="ACTIVE",
                )
            )


if __name__ == "__main__":
    unittest.main()
