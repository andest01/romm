from pathlib import Path

import pytest
from PIL import Image as PILImage
from sqlalchemy import select
from tests.factories import make_rom

from handler.database.base_handler import sync_session
from handler.filesystem.image_inventory import ImageLocation, classify
from models.image import COVER_LARGE, COVER_SMALL, Image, RomImage
from models.platform import Platform
from models.rom import Rom
from tasks.manual.inventory_images import run_inventory


def _png(root: Path, path: str, size: tuple[int, int]) -> None:
    full_path = root / path
    full_path.parent.mkdir(parents=True, exist_ok=True)
    PILImage.new("RGB", size, (10, 20, 30)).save(full_path, "PNG")


def _write_library(root: Path, rom: Rom) -> str:
    folder = f"roms/{rom.platform_id}/{rom.id}"
    _png(root, f"{folder}/cover/big.png", (60, 90))
    _png(root, f"{folder}/cover/small.png", (24, 36))
    _png(root, f"{folder}/box3d/box3d.png", (40, 50))
    (root / folder / "video").mkdir(parents=True)
    (root / folder / "video" / "video.mp4").write_bytes(b"not an image")
    _png(root, f"{folder}/unknown_kind/thing.png", (5, 5))
    return folder


def _paths() -> set[str]:
    with sync_session.begin() as session:
        return set(session.scalars(select(Image.path)))


@pytest.mark.parametrize(
    "path,expected",
    [
        ("roms/60/793/cover/big.png", ImageLocation("rom", 793, "cover", 60)),
        ("roms/60/793/box3d/box3d.png", ImageLocation("rom", 793, "box3d", 60)),
        ("roms/60/793/screenshots/0.jpg", ImageLocation("rom", 793, "screenshots", 60)),
        ("collections/7/cover/big.webp", ImageLocation("collection", 7, "cover", None)),
        ("roms/60/793/video/video.mp4", None),
        ("roms/60/793/manual/manual.pdf", None),
        ("roms/60/793/unknown_kind/thing.png", None),
        ("roms/60/793/cover/nested/big.png", None),
    ],
)
def test_classify_follows_the_resources_layout(
    path: str, expected: ImageLocation | None
) -> None:
    assert classify(path) == expected


def test_run_inventory_records_known_images_and_links_covers(
    tmp_path: Path, platform: Platform
) -> None:
    rom = make_rom(platform, "rom")
    folder = _write_library(tmp_path, rom)
    with sync_session.begin() as session:
        session.get_one(Rom, rom.id).path_cover_l = f"{folder}/cover/big.png"
        session.get_one(Rom, rom.id).path_cover_s = f"{folder}/cover/small.png"

    result = run_inventory(tmp_path)

    assert _paths() == {
        f"{folder}/cover/big.png",
        f"{folder}/cover/small.png",
        f"{folder}/box3d/box3d.png",
    }
    assert result["by kind"] == {"cover": 2, "box3d": 1}
    assert result["not an image we track"] == 2
    with sync_session.begin() as session:
        roles = set(
            session.scalars(select(RomImage.role).where(RomImage.rom_id == rom.id))
        )
    assert roles == {COVER_LARGE, COVER_SMALL}


def test_a_rerun_reads_nothing_unchanged(tmp_path: Path, platform: Platform) -> None:
    rom = make_rom(platform, "rom")
    _write_library(tmp_path, rom)
    run_inventory(tmp_path)

    result = run_inventory(tmp_path)

    assert result["unchanged"] == 3
    assert result["inserted"] == 0


def test_vanished_files_are_reported_and_only_deleted_with_prune(
    tmp_path: Path, platform: Platform
) -> None:
    rom = make_rom(platform, "rom")
    folder = _write_library(tmp_path, rom)
    run_inventory(tmp_path)
    (tmp_path / folder / "box3d" / "box3d.png").unlink()

    reported = run_inventory(tmp_path)
    assert reported["vanished rows"] == 1
    assert f"{folder}/box3d/box3d.png" in _paths()

    pruned = run_inventory(tmp_path, prune=True)
    assert pruned["rows deleted"] == 1
    assert f"{folder}/box3d/box3d.png" not in _paths()


def test_an_empty_resources_folder_never_prunes(
    tmp_path: Path, platform: Platform
) -> None:
    rom = make_rom(platform, "rom")
    _write_library(tmp_path / "real", rom)
    run_inventory(tmp_path / "real")

    result = run_inventory(tmp_path / "empty", prune=True)

    assert result["images found"] == 0
    assert result["vanished rows"] == 0
    assert len(_paths()) == 3


def test_a_cleared_cover_path_loses_its_link(
    tmp_path: Path, platform: Platform
) -> None:
    rom = make_rom(platform, "rom")
    folder = _write_library(tmp_path, rom)
    with sync_session.begin() as session:
        session.get_one(Rom, rom.id).path_cover_l = f"{folder}/cover/big.png"
        session.get_one(Rom, rom.id).path_cover_s = f"{folder}/cover/small.png"
    run_inventory(tmp_path)
    with sync_session.begin() as session:
        session.get_one(Rom, rom.id).path_cover_l = ""

    result = run_inventory(tmp_path)

    assert result["cover links removed"] == 1
    with sync_session.begin() as session:
        roles = set(
            session.scalars(select(RomImage.role).where(RomImage.rom_id == rom.id))
        )
    assert roles == {COVER_SMALL}
