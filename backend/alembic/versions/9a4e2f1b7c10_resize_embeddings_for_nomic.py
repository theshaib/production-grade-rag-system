"""resize embedding vectors for nomic embed text

Revision ID: 9a4e2f1b7c10
Revises: 70745da1269b
"""
from alembic import op

revision = "9a4e2f1b7c10"
down_revision = "70745da1269b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE chunks ALTER COLUMN embedding TYPE vector(768)")


def downgrade() -> None:
    op.execute("ALTER TABLE chunks ALTER COLUMN embedding TYPE vector(1536)")
