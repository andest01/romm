"""Add images, rom_images and collection_images tables

Revision ID: 0154_images
Revises: 0153_play_permissions
Create Date: 2026-10-13 00:00:00.000000

"""

from datetime import datetime

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "0154_images"
down_revision = "0153_play_permissions"
branch_labels = None
depends_on = None


def _timestamps() -> list[sa.Column[datetime]]:
    return [
        sa.Column(
            name,
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        )
        for name in ("created_at", "updated_at")
    ]


def _link_table(name: str, owner_column: str, owner_table: str) -> None:
    op.create_table(
        name,
        sa.Column(owner_column, sa.Integer(), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column("image_id", sa.Integer(), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            [owner_column], [f"{owner_table}.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["image_id"], ["images.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint(owner_column, "role"),
        if_not_exists=True,
    )
    op.create_index(f"ix_{name}_image_id", name, ["image_id"], if_not_exists=True)


def upgrade() -> None:
    op.create_table(
        "images",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("path", sa.Text(), nullable=False),
        sa.Column("path_hash", sa.String(length=64), nullable=False),
        sa.Column("width", sa.Integer(), nullable=False),
        sa.Column("height", sa.Integer(), nullable=False),
        sa.Column("format", sa.String(length=16), nullable=False),
        sa.Column("bytes", sa.BigInteger(), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=True),
        sa.Column("avg_color", sa.String(length=7), nullable=True),
        sa.Column("source_id", sa.Integer(), nullable=True),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("path_hash"),
        sa.ForeignKeyConstraint(["source_id"], ["images.id"], ondelete="CASCADE"),
        if_not_exists=True,
    )
    op.create_index(
        "ix_images_content_hash", "images", ["content_hash"], if_not_exists=True
    )
    op.create_index("ix_images_source_id", "images", ["source_id"], if_not_exists=True)
    _link_table("rom_images", "rom_id", "roms")
    _link_table("collection_images", "collection_id", "collections")


def downgrade() -> None:
    op.drop_table("collection_images", if_exists=True)
    op.drop_table("rom_images", if_exists=True)
    op.drop_table("images", if_exists=True)
