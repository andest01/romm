from typing import Any
from unittest.mock import MagicMock

from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy import select
from tests.factories import make_rom

from config import FRONTEND_RESOURCES_PATH
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


def _cache_cover(
    rom: Rom, role: str, width: int, height: int, image_format: str = "PNG"
) -> str:
    path = f"roms/{rom.platform_id}/{rom.id}/cover/{role}.png"
    with sync_session.begin() as session:
        image = Image(
            path=path,
            path_hash=compute_image_path_hash(path),
            width=width,
            height=height,
            format=image_format,
            bytes=1000,
        )
        session.add(image)
        session.flush()
        session.add(RomImage(rom_id=rom.id, role=role, image_id=image.id))
    return path


def _file(rom_id: int, path: str, width: int, height: int, mime: str) -> dict[str, Any]:
    rom = db_rom_handler.get_rom(rom_id)
    assert rom is not None
    return {
        "url": f"{FRONTEND_RESOURCES_PATH}/{path}?ts={rom.updated_at}",
        "width": width,
        "height": height,
        "type": mime,
    }


def _items_by_id(client: TestClient, access_token: str) -> dict[int, dict[str, Any]]:
    response = client.get(
        "/api/roms",
        headers={"Authorization": f"Bearer {access_token}"},
        params={"with_char_index": False, "with_filter_values": False},
    )
    assert response.status_code == status.HTTP_200_OK
    return {item["id"]: item for item in response.json()["items"]}


def test_the_rom_list_lists_each_cover_file_widest_first(
    client: TestClient, access_token: str, admin_user: User, platform: Platform
) -> None:
    cached = _add_rom(admin_user, platform, "cached")
    large_only = _add_rom(admin_user, platform, "large_only")
    uncached = _add_rom(admin_user, platform, "uncached")
    small = _cache_cover(cached, COVER_SMALL, 240, 360)
    large = _cache_cover(cached, COVER_LARGE, 600, 900, image_format="JPEG")
    only = _cache_cover(large_only, COVER_LARGE, 1024, 1024)

    items = _items_by_id(client, access_token)

    assert items[cached.id]["art"] == {
        "cover": [
            _file(cached.id, large, 600, 900, "image/jpeg"),
            _file(cached.id, small, 240, 360, "image/png"),
        ]
    }
    assert items[large_only.id]["art"] == {
        "cover": [_file(large_only.id, only, 1024, 1024, "image/png")]
    }
    assert items[uncached.id]["art"] == {}


def test_get_cover_files_for_roms_groups_the_cover_files_by_rom(
    admin_user: User, platform: Platform
) -> None:
    small_only = _add_rom(admin_user, platform, "small_only")
    both = _add_rom(admin_user, platform, "both")
    none = _add_rom(admin_user, platform, "none")
    _cache_cover(small_only, COVER_SMALL, 240, 360)
    _cache_cover(both, COVER_LARGE, 1024, 1024)
    _cache_cover(both, COVER_SMALL, 360, 360)

    with sync_session.begin() as session:
        files = db_image_handler.get_cover_files_for_roms(
            [small_only.id, both.id, none.id], session=session
        )

    assert {
        rom_id: [(f.width, f.height) for f in fs] for rom_id, fs in files.items()
    } == {
        small_only.id: [(240, 360)],
        both.id: [(1024, 1024), (360, 360)],
    }


def test_a_single_rom_carries_its_art_too(
    client: TestClient, access_token: str, admin_user: User, platform: Platform
) -> None:
    rom = _add_rom(admin_user, platform, "single")
    path = _cache_cover(rom, COVER_LARGE, 600, 900)

    response = client.get(
        f"/api/roms/{rom.id}/simple",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["art"] == {
        "cover": [_file(rom.id, path, 600, 900, "image/png")]
    }


def test_the_art_is_set_on_the_response_not_on_the_rom(
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

    assert not hasattr(db_rom, "art")
    assert [(f.width, f.height) for f in schema.art["cover"]] == [(600, 900)]


def _copy_of(original_path: str, path: str, width: int, height: int, size: int) -> None:
    with sync_session.begin() as session:
        original = session.scalars(
            select(Image).where(Image.path == original_path)
        ).one()
        session.add(
            Image(
                path=path,
                path_hash=compute_image_path_hash(path),
                width=width,
                height=height,
                format="WEBP",
                bytes=size,
                source_id=original.id,
            )
        )


def test_art_lists_each_copy_of_the_cover_once(
    client: TestClient, access_token: str, admin_user: User, platform: Platform
) -> None:
    rom = _add_rom(admin_user, platform, "with_copies")
    big = _cache_cover(rom, COVER_LARGE, 600, 900)
    small = _cache_cover(rom, COVER_SMALL, 240, 360)
    folder = big.rsplit("/", 1)[0]
    _copy_of(big, f"{folder}/big.webp", 600, 900, size=400)
    _copy_of(big, f"{folder}/small.webp", 240, 360, size=90)
    with sync_session.begin() as session:
        session.scalars(select(Image).where(Image.path == small)).one().source_id = (
            session.scalars(select(Image.id).where(Image.path == big)).one()
        )

    items = _items_by_id(client, access_token)

    assert items[rom.id]["art"] == {
        "cover": [
            _file(rom.id, f"{folder}/big.webp", 600, 900, "image/webp"),
            _file(rom.id, big, 600, 900, "image/png"),
            _file(rom.id, f"{folder}/small.webp", 240, 360, "image/webp"),
            _file(rom.id, small, 240, 360, "image/png"),
        ]
    }
