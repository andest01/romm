"""Store the gallery grouping's group key and pre-release rank on roms

The grouping window built both per query, for every row: a key out of up to
nine provider ids, and six pattern matches on the file name. Stored generated
columns compute them on write, and `idx_roms_group_key_cover` carries them
with everything else the window reads.

Revision ID: 0162_roms_group_key
Revises: 0161_save_channels
Create Date: 2026-11-18 00:00:00.000000

"""

from alembic import op

from utils.database import has_column
from utils.roms_columns import (
    GROUP_KEY_COLUMN,
    PRERELEASE_RANK_COLUMN,
    ROMS_METADATA_VIEW_COLUMNS,
    TABLE,
    ensure_roms_columns,
    rebuild_generated_columns,
)

# revision identifiers, used by Alembic.
revision = "0162_roms_group_key"
down_revision = "0161_save_channels"
branch_labels = None
depends_on = None


def upgrade() -> None:
    ensure_roms_columns(op.get_bind())


def downgrade() -> None:
    conn = op.get_bind()
    drop = [
        column
        for column in (GROUP_KEY_COLUMN, PRERELEASE_RANK_COLUMN)
        if has_column(conn, TABLE, column)
    ]
    if drop:
        rebuild_generated_columns(
            conn, add=[], drop=drop, view_columns=ROMS_METADATA_VIEW_COLUMNS
        )
