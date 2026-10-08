"""Password hashing contract and Argon2id implementation."""

from functools import lru_cache
from secrets import token_urlsafe
from typing import Protocol

from argon2 import PasswordHasher as Argon2Hasher
from argon2.exceptions import InvalidHashError, VerificationError


class PasswordHasher(Protocol):
    """The identity service depends on this small hashing contract."""

    def hash(self, password: str) -> str: ...

    def verify(self, encoded: str, password: str) -> bool: ...

    def needs_rehash(self, encoded: str) -> bool: ...


class Argon2PasswordHasher:
    """Argon2id with the maintained library's recommended defaults."""

    def __init__(self) -> None:
        self._hasher = Argon2Hasher()

    def hash(self, password: str) -> str:
        return self._hasher.hash(password)

    def verify(self, encoded: str, password: str) -> bool:
        try:
            return self._hasher.verify(encoded, password)
        except (InvalidHashError, VerificationError, ValueError):
            return False

    def needs_rehash(self, encoded: str) -> bool:
        return self._hasher.check_needs_rehash(encoded)


@lru_cache(maxsize=1)
def get_password_hasher() -> Argon2PasswordHasher:
    return Argon2PasswordHasher()


@lru_cache(maxsize=1)
def dummy_password_hash() -> str:
    """Equalize password verification work when the account does not exist."""
    return get_password_hasher().hash(token_urlsafe(32))
