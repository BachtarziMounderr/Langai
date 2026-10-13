"""Persist scoped lesson practice and first-attempt evidence.

Revision ID: e19c72bfa610
Revises: d28b7d480e21
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "e19c72bfa610"
down_revision = "d28b7d480e21"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "learning_practice_sets",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("course_id", sa.String(80), nullable=False),
        sa.Column("lesson_id", sa.String(80), nullable=False),
        sa.Column("language_code", sa.String(32), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("revision", sa.String(64), nullable=False),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("source_label", sa.String(200), nullable=False),
        sa.Column("questions", postgresql.JSONB(), nullable=False),
        sa.Column("generation_count", sa.Integer(), nullable=False),
        sa.Column("generation_started_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["language_code"], ["languages.code"]),
        sa.UniqueConstraint("id", "tenant_id", "user_id"),
        sa.UniqueConstraint("tenant_id", "user_id", "course_id", "lesson_id", "revision", "kind"),
        sa.CheckConstraint("status IN ('GENERATING', 'READY', 'FAILED')", name="status_valid"),
        sa.CheckConstraint("kind IN ('lesson', 'generated')", name="kind_valid"),
    )
    op.create_index(
        "ix_learning_practice_owner", "learning_practice_sets", ["tenant_id", "user_id"]
    )
    op.create_table(
        "learning_practice_attempts",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("practice_id", sa.UUID(), nullable=False),
        sa.Column("answers", postgresql.JSONB(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("total", sa.Integer(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["practice_id", "tenant_id", "user_id"],
            [
                "learning_practice_sets.id",
                "learning_practice_sets.tenant_id",
                "learning_practice_sets.user_id",
            ],
        ),
        sa.UniqueConstraint("practice_id", "tenant_id", "user_id"),
        sa.CheckConstraint("score >= 0 AND total > 0 AND score <= total", name="score_valid"),
    )
    op.create_index(
        "ix_learning_attempt_owner_date",
        "learning_practice_attempts",
        ["tenant_id", "user_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_table("learning_practice_attempts")
    op.drop_table("learning_practice_sets")
