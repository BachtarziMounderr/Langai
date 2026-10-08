"""The hosted demo bootstrap grants only one school-scoped Student context."""

import unittest
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_engine
from app.modules.identity.bootstrap_demo_student import create_demo_student
from app.modules.identity.models import User
from app.modules.identity.passwords import get_password_hasher
from app.modules.tenancy.public import resolve_routing_contexts


class DemoBootstrapTests(unittest.TestCase):
    def setUp(self) -> None:
        self.connection = get_engine().connect()
        self.transaction = self.connection.begin()
        self.addCleanup(self.connection.close)
        self.addCleanup(self.transaction.rollback)
        self.db = Session(
            bind=self.connection, join_transaction_mode="create_savepoint", expire_on_commit=False
        )
        self.addCleanup(self.db.close)

    def test_creates_only_one_student_context_and_rejects_duplicate(self) -> None:
        email = f"hosted-{uuid4().hex}@example.invalid"
        slug = f"demo-{uuid4().hex}"
        create_demo_student(
            self.db,
            email=email,
            password="a-strong-demo-password-42",
            school_name="Hosted Demo School",
            school_slug=slug,
        )
        user = self.db.scalars(select(User).where(User.email == email)).one()
        self.assertIsNotNone(user.password_hash)
        self.assertTrue(
            get_password_hasher().verify(user.password_hash, "a-strong-demo-password-42")
        )
        global_roles, contexts = resolve_routing_contexts(self.db, user.id)
        self.assertEqual(global_roles, [])
        self.assertEqual(len(contexts), 1)
        self.assertEqual((contexts[0].type, contexts[0].role), ("school", "STUDENT"))
        with self.assertRaisesRegex(ValueError, "already exists"):
            create_demo_student(
                self.db,
                email=email,
                password="a-strong-demo-password-42",
                school_name="Another School",
                school_slug=f"demo-{uuid4().hex}",
            )
