"""Store which version is each group's default pick on roms

The grouped gallery ran a window over every rom on every load to pick each
group's representative. `is_group_default` stores the pick a user with no
choices of their own sees, so the gallery reads it off
`idx_roms_group_default_name_sort_key` instead.

Revision ID: 0163_roms_group_default
Revises: 0162_roms_group_key
Create Date: 2026-11-18 00:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

from handler.database.roms_handler import (
    APPLIED_REGION_PRIORITY_KEY,
    record_region_priority_applied,
    refresh_group_defaults,
)
from handler.redis_handler import sync_cache
from utils.database import has_column, is_postgresql
from utils.roms_columns import (
    GROUP_DEFAULT_COLUMN,
    GROUP_DEFAULT_NAME_SORT_INDEX,
    TABLE,
    ensure_roms_columns,
)

# revision identifiers, used by Alembic.
revision = "0163_roms_group_default"
down_revision = "0162_roms_group_key"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    ensure_roms_columns(conn)
    refresh_group_defaults(conn)
    record_region_priority_applied()
    # The table copy leaves the planner without statistics for the new columns,
    # so the gallery would skip their indexes until autovacuum caught up.
    conn.execute(
        sa.text(f"ANALYZE {TABLE}" if is_postgresql(conn) else f"ANALYZE TABLE {TABLE}")
    )


def downgrade() -> None:
    conn = op.get_bind()
    # The flags go with the column; without the record the gallery won't trust them.
    sync_cache.delete(APPLIED_REGION_PRIORITY_KEY)
    if not has_column(conn, TABLE, GROUP_DEFAULT_COLUMN):
        return
    if GROUP_DEFAULT_NAME_SORT_INDEX in {
        index["name"] for index in sa.inspect(conn).get_indexes(TABLE)
    }:
        op.drop_index(GROUP_DEFAULT_NAME_SORT_INDEX, table_name=TABLE)
    op.drop_column(TABLE, GROUP_DEFAULT_COLUMN)
