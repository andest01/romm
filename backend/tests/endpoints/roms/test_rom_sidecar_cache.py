"""The gallery's letter strip and sorted id list follow each write.

`GET /roms` builds the id list and the letter strip live on every request, so a
write that moves a rom in a sort order must show up on the next request.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, cast

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from tests.factories import make_rom

from handler.database import db_rom_handler
from models.platform import Platform
from models.rom import Rom
from models.user import User


def _get_roms(client: TestClient, access_token: str, **params: Any) -> dict[str, Any]:
    response = client.get(
        "/api/roms",
        headers={"Authorization": f"Bearer {access_token}"},
        params=params,
    )
    assert response.status_code == status.HTTP_200_OK
    return cast(dict[str, Any], response.json())


@pytest.mark.parametrize(
    ("params", "expected"),
    [
        # Relevance leads, so the rows run in no letter order.
        ({"search_term": "final fantasy"}, {}),
        ({"search_term": "final fantasy", "order_by": "name"}, {"f": 0}),
        ({"search_term": "fantasy"}, {}),
        # Too short to rank, so the name order stands.
        ({"search_term": "fa"}, {"f": 0}),
        ({}, {"f": 0}),
    ],
)
def test_char_index_follows_whether_relevance_leads(
    client: TestClient,
    access_token: str,
    platform: Platform,
    params: dict[str, str],
    expected: dict[str, int],
):
    make_rom(platform, "Final Fantasy")
    make_rom(platform, "Final Fantasy VII")

    body = _get_roms(client, access_token, **params)

    assert body["char_index"] == expected


def _put_props(
    client: TestClient,
    access_token: str,
    rom_id: int,
    body: dict[str, Any] | None = None,
    **params: Any,
) -> None:
    response = client.put(
        f"/api/roms/{rom_id}/props",
        headers={"Authorization": f"Bearer {access_token}"},
        params=params,
        json=body or {},
    )
    assert response.status_code == status.HTTP_200_OK


@pytest.fixture
def played_rom(rom: Rom, admin_user: User) -> Rom:
    """The shared rom with an old `last_played`, so a later play must reorder past it."""
    rom_user = db_rom_handler.get_rom_user(rom.id, admin_user.id)
    assert rom_user is not None
    db_rom_handler.update_rom_user(
        rom_user.id, {"last_played": datetime(2020, 1, 1, tzinfo=timezone.utc)}
    )
    return rom


def _ingest_play_session(client: TestClient, access_token: str, rom_id: int) -> None:
    end = datetime.now(timezone.utc).replace(microsecond=0)
    response = client.post(
        "/api/play-sessions",
        headers={"Authorization": f"Bearer {access_token}"},
        json={
            "sessions": [
                {
                    "rom_id": rom_id,
                    "start_time": (end - timedelta(minutes=30)).isoformat(),
                    "end_time": end.isoformat(),
                    "duration_ms": 30 * 60 * 1000,
                }
            ]
        },
    )
    assert response.status_code == status.HTTP_201_CREATED


@pytest.mark.parametrize("trigger", ["props", "play_session"])
def test_last_played_write_refreshes_the_sorted_index(
    client: TestClient,
    access_token: str,
    played_rom: Rom,
    second_rom: Rom,
    trigger: str,
):
    """Both `last_played` writers reorder the next sorted index."""
    first = _get_roms(client, access_token, order_by="last_played", order_dir="desc")
    assert first["rom_id_index"] == [played_rom.id, second_rom.id]

    if trigger == "props":
        _put_props(client, access_token, second_rom.id, update_last_played=True)
    else:
        _ingest_play_session(client, access_token, second_rom.id)

    second = _get_roms(client, access_token, order_by="last_played", order_dir="desc")
    assert second["rom_id_index"] == [second_rom.id, played_rom.id]
