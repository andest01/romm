"""The stored pre-release rank that orders a sibling group's versions: a tag counts only right after "("."""

import pytest
from sqlalchemy import select
from tests.conftest import engine  # noqa: F401  (loads the test database setup)
from tests.factories import make_rom

from handler.database.base_handler import sync_session
from models.platform import Platform
from models.rom import Rom


@pytest.mark.parametrize(
    ("stem", "rank"),
    [
        ("Game One (USA)", 0),
        ("Game Two (Demo)", 1),
        # Upper case: the match must be case-insensitive on this database too.
        ("GAME THREE (DEMO) (USA)", 1),
        ("Game Four (Beta 2)", 1),
        ("Game Five (Prototype)", 1),
        ("Game Six (Kiosk Demo)", 1),
        ("Game Eight (Sample)", 1),
        ("Game Nine (Preview)", 1),
        # Accent-sensitive on both engines, whatever the MariaDB collation.
        ("Game Seven (Démo)", 0),
        # A tag counts only right after "(".
        ("Demolition Man (USA)", 0),
        ("Beta Fish (USA)", 0),
        ("Game [Preview]", 0),
        ("Game - Demo Edition", 0),
    ],
)
def test_the_stored_rank_on_a_real_row(platform: Platform, stem: str, rank: int):
    """Runs on whichever database the suite uses, so the engine's own regex decides."""
    rom = make_rom(platform, stem)

    with sync_session.begin() as session:
        result = session.scalar(select(Rom.prerelease_rank).where(Rom.id == rom.id))

    assert result == rank
