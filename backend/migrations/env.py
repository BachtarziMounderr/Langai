"""Alembic environment using the same configured PostgreSQL URL as the app."""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from app.db import models as _models  # noqa: F401 - registers all tables
from app.db.base import Base
from app.db.session import database_url

config = context.config
if config.config_file_name and config.get_section("loggers"):
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Emit SQL without a connection, using the configured dialect."""
    context.configure(
        url=database_url().render_as_string(hide_password=False),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in a fresh, non-pooled connection."""
    engine = create_engine(database_url(), poolclass=pool.NullPool)
    try:
        with engine.connect() as connection:
            context.configure(
                connection=connection, target_metadata=target_metadata, compare_type=True
            )
            with context.begin_transaction():
                context.run_migrations()
    finally:
        engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
