from datetime import datetime, timezone

from tests.conftest import make_platform, make_rom

from handler.database import db_rom_handler
from models.rom import Rom


def _index(order_by: str, order_dir: str = "asc") -> list[tuple[str, int]]:
    query, sort_key = db_rom_handler.get_roms_query(
        order_by=order_by, order_dir=order_dir
    )
    return db_rom_handler.with_char_index(query, sort_key.column, order_dir=order_dir)


def test_platform_buckets_follow_display_name():
    # Arrange
    zebra = make_platform("zebra_slug", name="Zebra")
    alpha = make_platform("alpha_slug", name="Alpha")
    make_rom(zebra, "zebra_rom", slug="zebra_rom_slug")
    make_rom(alpha, "alpha_rom_1", slug="alpha_rom_1_slug")
    make_rom(alpha, "alpha_rom_2", slug="alpha_rom_2_slug")

    # Act
    index = _index("platform_id")

    # Assert
    assert index == [("Alpha", 0), ("Zebra", 2)]


def test_added_buckets_by_year(rom: Rom):
    # Arrange
    year = datetime.now(timezone.utc).year

    # Act
    index = _index("created_at")

    # Assert
    assert index[0][0] in {str(year - 1), str(year)}


def test_missing_rating_is_an_unknown_bucket(rom: Rom):
    # Act
    index = _index("average_rating", "desc")

    # Assert
    assert index == [("Unknown", 0)]


def test_missing_release_date_is_an_unknown_bucket(rom: Rom):
    # Act
    index = _index("first_release_date")

    # Assert
    assert index == [("Unknown", 0)]
