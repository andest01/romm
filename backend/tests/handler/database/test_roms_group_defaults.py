"""The stored `is_group_default` pick and the gallery path that reads it.

Every write that can move a rom between groups re-picks the groups it
touched, and the grouped gallery reads the pick only where it must equal what
the window would choose.
"""

import pytest
from sqlalchemy import select
from tests.factories import make_rom

from handler.auth.rom_visibility import UNRESTRICTED
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


def _group_defaults() -> set[int]:
    with sync_session.begin() as session:
        return set(
            session.scalars(select(Rom.id).where(Rom.is_group_default.is_(True)))
        )


def _filtered(user_id: int | None, order_dir: str, *, grouped: bool):
    query, sort_key = db_rom_handler.get_roms_query(
        order_by="name", order_dir=order_dir, user_id=user_id
    )
    query = db_rom_handler.filter_roms(
        query=query,
        filters=RomFilterParams(group_by_meta_id=grouped),
        sort_key=sort_key,
        order_by="name",
        order_dir=order_dir,
        user_id=user_id,
        include_related=False,
    )
    return query, sort_key


def _window_index(user_id: int | None, order_dir: str):
    query, sort_key = _filtered(user_id, order_dir, grouped=True)
    ids = db_rom_handler.get_rom_id_index(query=query)
    letters = db_rom_handler.with_char_index(
        query, sort_key.column, order_dir=order_dir
    )
    return ids, [tuple(entry) for entry in letters]


def _stored_index(user_id: int | None, order_dir: str):
    query, _ = _filtered(user_id, order_dir, grouped=False)
    ids, letters = db_rom_handler.get_gallery_index(
        db_rom_handler.group_defaults_index_rows(
            query, user_id=user_id, order_dir=order_dir
        )
    )
    return ids, [tuple(entry) for entry in letters]


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


@pytest.mark.parametrize("order_dir", ["asc", "desc"])
def test_the_stored_path_matches_the_window(
    platform: Platform, admin_user: User, current_picks, order_dir: str
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
        assert _stored_index(user_id, order_dir) == _window_index(user_id, order_dir)


def test_the_stored_path_waits_for_the_current_region_priority():
    _, sort_key = db_rom_handler.get_roms_query(order_by="name")
    filters = RomFilterParams(group_by_meta_id=True)

    sync_cache.delete(APPLIED_REGION_PRIORITY_KEY)
    stale = db_rom_handler.group_defaults_apply(
        filters, sort_key=sort_key, visibility=UNRESTRICTED
    )
    record_region_priority_applied()
    current = db_rom_handler.group_defaults_apply(
        filters, sort_key=sort_key, visibility=UNRESTRICTED
    )
    sync_cache.delete(APPLIED_REGION_PRIORITY_KEY)

    assert (stale, current) == (False, True)
