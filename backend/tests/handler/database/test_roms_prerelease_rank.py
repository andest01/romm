"""The pre-release rank that orders a sibling group's versions.

It reads one case-insensitive regex over the filename, in place of a LIKE per
tag. The regex has to keep the old rule: a tag counts only right after "(".
"""

import re

import pytest
from sqlalchemy import select
from sqlalchemy.dialects import mysql, postgresql
from tests.conftest import engine  # noqa: F401  (loads the test database setup)

from handler.database.roms_handler import _PRERELEASE_PATTERN, _prerelease_rank
from models.base import PRERELEASE_FILENAME_TAGS


def _old_rule(name: str) -> bool:
    """What the six LIKEs said: the lowercase name contains "(" plus a tag."""
    return any(f"({tag}" in name.lower() for tag in PRERELEASE_FILENAME_TAGS)


NAMES = [
    "Game (USA)",
    "Game (Demo)",
    "Game (DEMO) (USA)",
    "Game (Demo Kiosk)",
    "Game (Beta 2)",
    "Game (Proto)",
    "Game (Prototype)",
    "Game (Sample)",
    "Game (Kiosk)",
    "Game (Preview)",
    "Game (Europe) (Beta)",
    "Demolition Man (USA)",
    "Beta Fish (USA)",
    "Game [Preview]",
    "Game - Demo Edition",
    "Game (Rev 1)",
    "",
]


@pytest.mark.parametrize("name", NAMES)
def test_the_regex_agrees_with_the_old_like_rule(name: str):
    assert bool(re.search(_PRERELEASE_PATTERN, name, re.IGNORECASE)) == _old_rule(name)


def test_the_regex_is_one_match_per_row_not_one_per_tag():
    sql = str(select(_prerelease_rank()).compile(dialect=postgresql.dialect())).lower()

    assert "ilike" not in sql
    assert sql.count("~*") == 1


def test_the_regex_compiles_for_mariadb_too():
    sql = str(select(_prerelease_rank()).compile(dialect=mysql.dialect())).lower()

    assert "regexp" in sql
    assert "like" not in sql.replace("regexp_like", "")
