import json
from typing import Any

from fastapi import status
from fastapi.testclient import TestClient
from pytest_mock import MockerFixture
from tests.factories import make_rom

from endpoints.fields import schema_field_names
from endpoints.responses.rom import ROM_FIELD_GROUPS, SimpleRomSchema
from handler.database import db_rom_handler
from models.platform import Platform
from models.user import User

PAGE_KEYS = {
    "items",
    "total",
    "limit",
    "offset",
    "char_index",
    "rom_id_index",
    "filter_values",
}


def _get(client: TestClient, token: str, **params: Any):
    return client.get(
        "/api/roms",
        headers={"Authorization": f"Bearer {token}"},
        params={"with_char_index": False, "with_filter_values": False, **params},
    )


def _add_rom(admin_user: User, platform: Platform, name: str) -> None:
    rom = make_rom(platform, name)
    db_rom_handler.add_rom_user(rom_id=rom.id, user_id=admin_user.id)


def test_without_fields_every_item_carries_every_field(
    client: TestClient, access_token: str, admin_user: User, platform: Platform
) -> None:
    _add_rom(admin_user, platform, "full")

    response = _get(client, access_token)

    assert response.status_code == status.HTTP_200_OK
    assert set(response.json()["items"][0]) == schema_field_names(SimpleRomSchema)


def test_fields_returns_only_those_keys_plus_id(
    client: TestClient, access_token: str, admin_user: User, platform: Platform
) -> None:
    _add_rom(admin_user, platform, "projected")

    response = _get(client, access_token, fields="name,platform_id")

    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert set(body) == PAGE_KEYS
    assert [set(item) for item in body["items"]] == [{"id", "name", "platform_id"}]
    assert body["items"][0]["name"] == "projected"


def test_a_requested_empty_field_is_null_not_absent(
    client: TestClient, access_token: str, admin_user: User, platform: Platform
) -> None:
    _add_rom(admin_user, platform, "empty")

    item = _get(client, access_token, fields="ss_metadata")["items"][0]

    assert "ss_metadata" in item
    assert item["ss_metadata"] is None


def test_the_provider_metadata_group_expands(
    client: TestClient, access_token: str, admin_user: User, platform: Platform
) -> None:
    _add_rom(admin_user, platform, "grouped")

    item = _get(client, access_token, fields="@provider_metadata")["items"][0]

    assert set(item) == ROM_FIELD_GROUPS["provider_metadata"] | {"id"}


def test_an_unknown_field_is_a_400_naming_it(
    client: TestClient, access_token: str
) -> None:
    response = _get(client, access_token, fields="name,not_a_field")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "not_a_field" in response.json()["detail"]


def test_loads_for_unrequested_fields_are_skipped(
    client: TestClient,
    access_token: str,
    admin_user: User,
    platform: Platform,
    mocker: MockerFixture,
) -> None:
    _add_rom(admin_user, platform, "lean")
    siblings = mocker.spy(db_rom_handler, "get_siblings_for_roms")
    notes = mocker.spy(db_rom_handler, "get_rom_ids_with_notes")

    _get(client, access_token, fields="name")
    assert siblings.call_count == 0
    assert notes.call_count == 0

    _get(client, access_token, fields="name,sibling_roms")
    assert siblings.call_count == 1


def test_a_projected_page_is_smaller(
    client: TestClient, access_token: str, admin_user: User, platform: Platform
) -> None:
    for name in ("one", "two", "three"):
        _add_rom(admin_user, platform, name)

    full = _get(client, access_token).json()["items"]
    lean = _get(client, access_token, fields="name,platform_id").json()["items"]

    assert len(json.dumps(lean)) * 4 < len(json.dumps(full))


def test_the_provider_metadata_group_names_are_pinned() -> None:
    assert ROM_FIELD_GROUPS["provider_metadata"] == {
        "igdb_metadata",
        "moby_metadata",
        "ss_metadata",
        "launchbox_metadata",
        "hasheous_metadata",
        "flashpoint_metadata",
        "hltb_metadata",
        "demozoo_metadata",
        "pouet_metadata",
        "csdb_metadata",
        "steam_metadata",
        "gamelist_metadata",
        "merged_ra_metadata",
    }
