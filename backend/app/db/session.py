"""Lazy synchronous PostgreSQL engine and request-session dependency."""

from collections.abc import Iterator
from functools import lru_cache
from os import environ

from sqlalchemy import create_engine
from sqlalchemy.engine import URL, Engine, make_url
from sqlalchemy.orm import Session, sessionmaker


def database_url() -> URL:
    """Read the configured URL and select the psycopg 3 SQLAlchemy dialect."""
    raw_url = environ.get("DATABASE_URL")
    if not raw_url:
        raise RuntimeError("DATABASE_URL is required for database operations")
    url = make_url(raw_url)
    if url.drivername == "postgresql":
        return url.set(drivername="postgresql+psycopg")
    if url.drivername != "postgresql+psycopg":
        raise RuntimeError("DATABASE_URL must use PostgreSQL with psycopg")
    return url


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    """Create the engine on first database use, without connecting at API import."""
    return create_engine(database_url(), pool_pre_ping=True)


@lru_cache(maxsize=1)
def get_session_factory() -> sessionmaker[Session]:
    """Return a factory; services own commits and transaction boundaries."""
    return sessionmaker(bind=get_engine(), autoflush=False, expire_on_commit=False)


def get_session() -> Iterator[Session]:
    """Yield a session for a future FastAPI dependency and always close it."""
    with get_session_factory()() as session:
        yield session


def dispose_engine() -> None:
    """Release pooled connections at a future application shutdown boundary."""
    get_session_factory.cache_clear()
    if get_engine.cache_info().currsize:
        get_engine().dispose()
    get_engine.cache_clear()
