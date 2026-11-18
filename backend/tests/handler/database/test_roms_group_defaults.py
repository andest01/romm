"""The stored `is_group_default` pick and the gallery path that reads it.

Every write that can move a rom between groups re-picks the groups it
touched, and the grouped gallery reads the pick only where it must equal what
the window would choose.
"""

from datetime import datetime, timezone

import pytest
from sqlalchemy import select
from tests.factories import make_rom

from handler.database import db_rom_handler
from handler.database.base_handler import sync_session
from handler.database.rom_filters import RomFilterParams
from handler.database.roms_handler import (
    APPLIED_REGION_PRIORITY_KEY,
    record_region_priority_applied,
)
from handler.redis_handler import sync_cache
from models.platform import Platform
from models.rom import Rom
from models.user import User

# Keeps every row while switching the stored path off, so the window decides.
EVERY_ROW = datetime(1970, 1, 1, tzinfo=timezone.utc)


def _group_defaults() -> set[int]:
    with sync_session.begin() as session:
        return set(
            session.scalars(select(Rom.id).where(Rom.is_group_default.is_(True)))
        )


def _grouped(
    user_id: int | None, *, updated_after: datetime | None = None
) -> list[int]:
    query, sort_key = db_rom_handler.get_roms_query(order_by="name", user_id=user_id)
    query = db_rom_handler.filter_roms(
        query=query,
        filters=RomFilterParams(group_by_meta_id=True),
        sort_key=sort_key,
        order_by="name",
        user_id=user_id,
        updated_after=updated_after,
    )
    with sync_session.begin() as session:
        return list(session.scalars(query.with_only_columns(Rom.id)))


@pytest.fixture
def current_picks():
    record_region_priority_applied()
    yield
    sync_cache.delete(APPLIED_REGION_PRIORITY_KEY)


def test_each_group_has_one_primary(platform: Platform):
    demo = make_rom(platform, "Shared", fs_stem="Shared (Demo)", igdb_id=1)
    full = make_rom(platform, "Shared", fs_stem="Shared (USA)", igdb_id=1)
    unmatched = make_rom(platform, "Loose")

    assert _group_defaults() >= {full.id, unmatched.id}
    assert demo.id not in _group_defaults()


def test_moving_the_primary_re_picks_both_groups(platform: Platform):
    full = make_rom(platform, "Shared", fs_stem="Shared (USA)", igdb_id=1)
    demo = make_rom(platform, "Shared", fs_stem="Shared (Demo)", igdb_id=1)
    other = make_rom(platform, "Other", fs_stem="Other (Demo)", igdb_id=2)

    db_rom_handler.update_rom(full.id, {"igdb_id": 2})

    assert demo.id in _group_defaults()
    assert full.id in _group_defaults()
    assert other.id not in _group_defaults()


def test_deleting_the_primary_promotes_the_next(platform: Platform):
    full = make_rom(platform, "Shared", fs_stem="Shared (USA)", igdb_id=1)
    demo = make_rom(platform, "Shared", fs_stem="Shared (Demo)", igdb_id=1)

    db_rom_handler.delete_rom(full.id)

    assert demo.id in _group_defaults()


def test_the_stored_path_matches_the_window(
    platform: Platform, admin_user: User, current_picks
):
    make_rom(platform, "Plain", fs_stem="Plain (USA)", igdb_id=1)
    make_rom(platform, "Plain", fs_stem="Plain (Demo)", igdb_id=1)
    hidden = make_rom(platform, "Hidden", fs_stem="Hidden (USA)", igdb_id=2)
    make_rom(platform, "Hidden", fs_stem="Hidden (Europe)", igdb_id=2)
    make_rom(platform, "Picked", fs_stem="Picked (USA)", igdb_id=3)
    picked = make_rom(platform, "Picked", fs_stem="Picked (Japan)", igdb_id=3)
    make_rom(platform, "Loose")
    for rom, props in ((hidden, {"hidden": True}), (picked, {"is_main_sibling": True})):
        rom_user = db_rom_handler.add_rom_user(rom.id, admin_user.id)
        db_rom_handler.update_rom_user(rom_user.id, props)

    for user_id in (admin_user.id, None):
        assert _grouped(user_id) == _grouped(user_id, updated_after=EVERY_ROW)


def test_the_stored_path_waits_for_the_current_region_priority(platform: Platform):
    query, _ = db_rom_handler.get_roms_query(order_by="name")
    filters = RomFilterParams(group_by_meta_id=True)

    sync_cache.delete(APPLIED_REGION_PRIORITY_KEY)
    stale = str(db_rom_handler.filter_roms(query=query, filters=filters))
    record_region_priority_applied()
    current = str(db_rom_handler.filter_roms(query=query, filters=filters))
    sync_cache.delete(APPLIED_REGION_PRIORITY_KEY)

    # The select list names every column; only the WHERE clause tells the paths apart.
    assert "is_group_default" not in stale.split("WHERE", 1)[1]
    assert "is_group_default" in current.split("WHERE", 1)[1]
