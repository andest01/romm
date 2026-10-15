from typing import Any
from unittest.mock import MagicMock

from fastapi import status
from fastapi.testclient import TestClient
from tests.factories import make_rom

from endpoints.responses.rom import SimpleRomSchema
from handler.database import db_image_handler, db_rom_handler
from handler.database.base_handler import sync_session
from models.image import (
    COVER_LARGE,
    COVER_SMALL,
    Image,
    RomImage,
    compute_image_path_hash,
)
from models.platform import Platform
from models.rom import Rom
from models.user import User


def _add_rom(admin_user: User, platform: Platform, name: str) -> Rom:
    rom = make_rom(platform, name)
    db_rom_handler.add_rom_user(rom_id=rom.id, user_id=admin_user.id)
    return rom


def _cache_cover(rom: Rom, role: str, width: int, height: int) -> None:
    path = f"roms/{rom.platform_id}/{rom.id}/cover/{role}.png"
    with sync_session.begin() as session:
        image = Image(
            path=path,
            path_hash=compute_image_path_hash(path),
            width=width,
            height=height,
            format="PNG",
            bytes=1000,
        )
        session.add(image)
        session.flush()
        session.add(RomImage(rom_id=rom.id, role=role, image_id=image.id))


def _items_by_id(client: TestClient, access_token: str) -> dict[int, dict[str, Any]]:
    response = client.get(
        "/api/roms",
        headers={"Authorization": f"Bearer {access_token}"},
        params={"with_char_index": False, "with_filter_values": False},
    )
    assert response.status_code == status.HTTP_200_OK
    return {item["id"]: item for item in response.json()["items"]}


def test_the_rom_list_carries_each_cached_cover_size(
    client: TestClient, access_token: str, admin_user: User, platform: Platform
) -> None:
    cached = _add_rom(admin_user, platform, "cached")
    large_only = _add_rom(admin_user, platform, "large_only")
    uncached = _add_rom(admin_user, platform, "uncached")
    _cache_cover(cached, COVER_LARGE, 600, 900)
    _cache_cover(cached, COVER_SMALL, 240, 360)
    _cache_cover(large_only, COVER_LARGE, 1024, 1024)

    items = _items_by_id(client, access_token)

    assert items[cached.id]["cover"] == {
        "large": {"width": 600, "height": 900},
        "small": {"width": 240, "height": 360},
    }
    assert items[large_only.id]["cover"] == {
        "large": {"width": 1024, "height": 1024},
        "small": None,
    }
    assert items[uncached.id]["cover"] == {"large": None, "small": None}


def test_get_cover_sizes_for_roms_groups_the_cover_roles_by_rom(
    admin_user: User, platform: Platform
) -> None:
    small_only = _add_rom(admin_user, platform, "small_only")
    both = _add_rom(admin_user, platform, "both")
    none = _add_rom(admin_user, platform, "none")
    _cache_cover(small_only, COVER_SMALL, 240, 360)
    _cache_cover(both, COVER_LARGE, 1024, 1024)
    _cache_cover(both, COVER_SMALL, 360, 360)

    with sync_session.begin() as session:
        sizes = db_image_handler.get_cover_sizes_for_roms(
            [small_only.id, both.id, none.id], session=session
        )

    assert sizes == {
        small_only.id: {COVER_SMALL: (240, 360)},
        both.id: {COVER_LARGE: (1024, 1024), COVER_SMALL: (360, 360)},
    }


def test_a_single_rom_carries_its_cover_size_too(
    client: TestClient, access_token: str, admin_user: User, platform: Platform
) -> None:
    rom = _add_rom(admin_user, platform, "single")
    _cache_cover(rom, COVER_LARGE, 600, 900)

    response = client.get(
        f"/api/roms/{rom.id}/simple",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["cover"] == {
        "large": {"width": 600, "height": 900},
        "small": None,
    }


def test_the_cover_is_set_on_the_response_not_on_the_rom(
    admin_user: User, platform: Platform
) -> None:
    rom = _add_rom(admin_user, platform, "untouched")
    _cache_cover(rom, COVER_LARGE, 600, 900)
    request = MagicMock()
    request.user.id = admin_user.id
    request.user.is_authenticated = False

    db_rom = db_rom_handler.get_rom_simple(rom.id)
    assert db_rom is not None
    schema = SimpleRomSchema.from_orm_with_request(db_rom, request)

    assert not hasattr(db_rom, "cover")
    assert schema.cover.large is not None
    assert (schema.cover.large.width, schema.cover.large.height) == (600, 900)
