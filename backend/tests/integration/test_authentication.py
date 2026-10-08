"""Authentication behavior against the migrated PostgreSQL schema."""

import unittest
from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import uuid4

import jwt
from fastapi import Depends
from fastapi.testclient import TestClient
from httpx import Response
from sqlalchemy.orm import Session

from app.db.session import get_engine, get_session
from app.main import create_app
from app.modules.identity.dependencies import get_current_user
from app.modules.identity.models import User
from app.modules.identity.passwords import get_password_hasher
from app.modules.identity.tokens import AUDIENCE, ISSUER, get_auth_settings

PASSWORD = "a-long-test-password-42"
NEW_PASSWORD = "a-different-long-password-84"
AUTH = "/api/v1/auth"
COOKIE_HEADERS = {"Origin": "http://localhost:3000", "X-Requested-With": "XMLHttpRequest"}


class AuthenticationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.connection = get_engine().connect()
        self.transaction = self.connection.begin()
        self.addCleanup(self.connection.close)
        self.addCleanup(self.transaction.rollback)

        app = create_app()

        def test_session():
            with Session(
                bind=self.connection,
                join_transaction_mode="create_savepoint",
                expire_on_commit=False,
            ) as session:
                yield session

        app.dependency_overrides[get_session] = test_session

        @app.get("/test-only/protected")
        def protected(_user: Annotated[User, Depends(get_current_user)]) -> dict[str, bool]:
            return {"allowed": True}

        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def create_user(self, *, status: str = "ACTIVE", temporary: bool = False) -> User:
        user = User(
            id=uuid4(),
            email=f"test-{uuid4().hex}@example.invalid",
            password_hash=get_password_hasher().hash(PASSWORD),
            status=status,
            must_change_password=temporary,
        )
        with Session(
            bind=self.connection, join_transaction_mode="create_savepoint", expire_on_commit=False
        ) as db:
            db.add(user)
            db.commit()
        return user

    def login(self, user: User, password: str = PASSWORD) -> Response:
        return self.client.post(f"{AUTH}/login", json={"email": user.email, "password": password})

    def test_passwords_are_argon2id_and_verify(self) -> None:
        encoded = get_password_hasher().hash(PASSWORD)
        self.assertTrue(encoded.startswith("$argon2id$"))
        self.assertTrue(get_password_hasher().verify(encoded, PASSWORD))
        self.assertFalse(get_password_hasher().verify(encoded, "wrong"))
        self.assertFalse(get_password_hasher().verify("malformed-hash", PASSWORD))
        self.assertNotEqual(encoded, get_password_hasher().hash(PASSWORD))

    def test_login_and_me_return_only_safe_fields(self) -> None:
        user = self.create_user()
        response = self.login(user)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["token_type"], "bearer")
        self.assertNotIn("refresh_token", response.json())
        self.assertNotIn("password_hash", response.text)
        cookie = response.headers["set-cookie"]
        self.assertIn("httponly", cookie.lower())
        self.assertIn("samesite=lax", cookie.lower())
        profile = self.client.get(
            f"{AUTH}/me", headers={"Authorization": f"Bearer {response.json()['access_token']}"}
        )
        self.assertEqual(profile.status_code, 200)
        self.assertEqual(profile.json()["email"], user.email)
        self.assertNotIn("password_hash", profile.text)

    def test_invalid_and_unknown_credentials_use_one_error(self) -> None:
        user = self.create_user()
        wrong = self.login(user, "wrong")
        unknown = self.client.post(
            f"{AUTH}/login", json={"email": "missing@example.invalid", "password": "wrong"}
        )
        self.assertEqual(wrong.status_code, 401)
        self.assertEqual(unknown.status_code, 401)
        self.assertEqual(wrong.json(), unknown.json())
        self.assertEqual(wrong.json()["error"]["message"], "Invalid credentials")

    def test_pending_and_suspended_users_cannot_login(self) -> None:
        for status in ("PENDING", "SUSPENDED"):
            with self.subTest(status=status):
                self.assertEqual(self.login(self.create_user(status=status)).status_code, 401)

    def test_me_requires_valid_unexpired_access_token(self) -> None:
        user = self.create_user()
        self.assertEqual(self.client.get(f"{AUTH}/me").status_code, 401)
        login = self.login(user).json()
        claims = jwt.decode(
            login["access_token"],
            get_auth_settings().secret,
            algorithms=["HS256"],
            audience=AUDIENCE,
            issuer=ISSUER,
        )
        claims["iat"] = datetime.now(UTC) - timedelta(hours=2)
        claims["exp"] = datetime.now(UTC) - timedelta(hours=1)
        expired = jwt.encode(claims, get_auth_settings().secret, algorithm="HS256")
        self.assertEqual(
            self.client.get(
                f"{AUTH}/me", headers={"Authorization": f"Bearer {expired}"}
            ).status_code,
            401,
        )

    def test_refresh_rotates_and_reuse_revokes_session(self) -> None:
        user = self.create_user()
        self.login(user)
        old_cookie = self.client.cookies.get("lingua_refresh")
        self.assertIsNotNone(old_cookie)
        renewed = self.client.post(f"{AUTH}/refresh", headers=COOKIE_HEADERS)
        self.assertEqual(renewed.status_code, 200)
        self.assertNotEqual(old_cookie, self.client.cookies.get("lingua_refresh"))
        self.assertEqual(
            self.client.get(
                f"{AUTH}/me",
                headers={"Authorization": f"Bearer {renewed.json()['access_token']}"},
            ).status_code,
            200,
        )
        replay = self.client.post(
            f"{AUTH}/refresh",
            headers={**COOKIE_HEADERS, "Cookie": f"lingua_refresh={old_cookie}"},
        )
        self.assertEqual(replay.status_code, 401)
        self.assertEqual(
            self.client.post(f"{AUTH}/refresh", headers=COOKIE_HEADERS).status_code, 401
        )

    def test_refresh_requires_origin_and_non_simple_header(self) -> None:
        self.login(self.create_user())
        self.assertEqual(self.client.post(f"{AUTH}/refresh").status_code, 403)
        self.assertEqual(
            self.client.post(
                f"{AUTH}/refresh",
                headers={"Origin": "http://evil.invalid", "X-Requested-With": "XMLHttpRequest"},
            ).status_code,
            403,
        )

    def test_logout_revokes_refresh_and_access(self) -> None:
        login = self.login(self.create_user()).json()
        self.assertEqual(
            self.client.post(f"{AUTH}/logout", headers=COOKIE_HEADERS).status_code, 204
        )
        self.assertEqual(
            self.client.post(f"{AUTH}/refresh", headers=COOKIE_HEADERS).status_code, 401
        )
        self.assertEqual(
            self.client.get(
                f"{AUTH}/me", headers={"Authorization": f"Bearer {login['access_token']}"}
            ).status_code,
            401,
        )

    def test_account_suspension_invalidates_existing_session(self) -> None:
        user = self.create_user()
        login = self.login(user).json()
        with Session(bind=self.connection, join_transaction_mode="create_savepoint") as db:
            db_user = db.get(User, user.id)
            assert db_user is not None
            db_user.status = "SUSPENDED"
            db.commit()
        self.assertEqual(
            self.client.get(
                f"{AUTH}/me", headers={"Authorization": f"Bearer {login['access_token']}"}
            ).status_code,
            401,
        )
        self.assertEqual(
            self.client.post(f"{AUTH}/refresh", headers=COOKIE_HEADERS).status_code, 401
        )

    def test_temporary_password_limits_normal_access_until_changed(self) -> None:
        user = self.create_user(temporary=True)
        login = self.login(user)
        access = login.json()["access_token"]
        self.assertTrue(login.json()["must_change_password"])
        headers = {"Authorization": f"Bearer {access}"}
        self.assertTrue(
            self.client.get(f"{AUTH}/me", headers=headers).json()["must_change_password"]
        )
        denied = self.client.get("/test-only/protected", headers=headers)
        self.assertEqual(denied.status_code, 403)
        self.assertEqual(denied.json()["error"]["code"], "PASSWORD_CHANGE_REQUIRED")
        changed = self.client.post(
            f"{AUTH}/change-password",
            headers=headers,
            json={"current_password": PASSWORD, "new_password": NEW_PASSWORD},
        )
        self.assertEqual(changed.status_code, 204)
        self.assertEqual(self.client.get(f"{AUTH}/me", headers=headers).status_code, 401)
        self.assertEqual(self.login(user, PASSWORD).status_code, 401)
        relogin = self.login(user, NEW_PASSWORD).json()
        self.assertFalse(relogin["must_change_password"])
        self.assertEqual(
            self.client.get(
                "/test-only/protected",
                headers={"Authorization": f"Bearer {relogin['access_token']}"},
            ).status_code,
            200,
        )


if __name__ == "__main__":
    unittest.main()
