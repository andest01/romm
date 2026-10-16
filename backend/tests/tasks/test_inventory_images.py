import asyncio
from pathlib import Path

import pytest
from PIL import Image as PILImage
from pytest_mock import MockerFixture
from sqlalchemy import select
from tests.factories import make_rom

import tasks.manual.inventory_images as inventory_module
from handler.database import db_image_handler
from handler.database.base_handler import sync_session
from handler.filesystem.image_inventory import (
    ImageLocation,
    classify,
    original_path,
)
from models.image import (
    COVER_LARGE,
    COVER_SMALL,
    Image,
    RomImage,
    compute_image_path_hash,
)
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
    assert roles == {COVER_LARGE, COVER_SMALL, "box3d"}


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
    assert _roles(rom.id) == {COVER_SMALL, "box3d"}


@pytest.mark.parametrize(
    "path,expected",
    [
        ("roms/60/793/cover/small.png", "roms/60/793/cover/big.png"),
        ("roms/60/793/cover/big.webp", "roms/60/793/cover/big.png"),
        ("roms/60/793/cover/small.webp", "roms/60/793/cover/big.png"),
        ("collections/7/cover/small.png", "collections/7/cover/big.png"),
        ("roms/60/793/cover/big.png", None),
        ("roms/60/793/box3d/box3d.png", None),
        ("roms/60/793/box3d/box3d.webp", "roms/60/793/box3d/box3d.png"),
        ("roms/60/793/logo/logo.webp", "roms/60/793/logo/logo.png"),
        ("roms/60/793/screenshots/0.jpg", None),
        ("roms/60/793/video/video.mp4", None),
    ],
)
def test_a_copy_names_its_original(path: str, expected: str | None) -> None:
    assert original_path(path) == expected


def _image(path: str) -> None:
    with sync_session.begin() as session:
        session.add(
            Image(
                path=path,
                path_hash=compute_image_path_hash(path),
                width=10,
                height=10,
                format="PNG",
                bytes=100,
            )
        )


def _source_of(path: str) -> str | None:
    with sync_session.begin() as session:
        image = session.scalars(select(Image).where(Image.path == path)).one()
        if image.source_id is None:
            return None
        return session.get_one(Image, image.source_id).path


def test_link_sources_points_copies_at_their_original() -> None:
    big, small, webp = (
        f"roms/1/2/cover/{name}" for name in ("big.png", "small.png", "big.webp")
    )
    for path in (big, small, webp):
        _image(path)

    changed = db_image_handler.link_sources({big: None, small: big, webp: big})

    assert changed == 2
    assert [_source_of(path) for path in (big, small, webp)] == [None, big, big]


def test_link_sources_refuses_a_copy_of_a_copy() -> None:
    big, small, webp = (
        f"roms/1/3/cover/{n}" for n in ("big.png", "small.png", "small.webp")
    )
    for path in (big, small, webp):
        _image(path)

    with pytest.raises(ValueError, match="is itself a copy"):
        db_image_handler.link_sources({big: None, small: big, webp: small})


def test_run_inventory_points_cover_copies_at_big_png(
    tmp_path: Path, platform: Platform
) -> None:
    rom = make_rom(platform, "lineage")
    folder = _write_library(tmp_path, rom)
    _png(tmp_path, f"{folder}/cover/big.webp", (60, 90))

    report = run_inventory(tmp_path)

    big = f"{folder}/cover/big.png"
    assert report["copies linked to their original"] == 2
    assert _source_of(big) is None
    assert _source_of(f"{folder}/cover/small.png") == big
    assert _source_of(f"{folder}/cover/big.webp") == big
    assert _source_of(f"{folder}/box3d/box3d.png") is None


def _roles(rom_id: int) -> set[str]:
    with sync_session.begin() as session:
        return set(
            session.scalars(select(RomImage.role).where(RomImage.rom_id == rom_id))
        )


def test_media_is_linked_by_kind_and_unlinked_when_its_file_goes(
    tmp_path: Path, platform: Platform
) -> None:
    rom = make_rom(platform, "media")
    folder = _write_library(tmp_path, rom)
    _png(tmp_path, f"{folder}/logo/logo.png", (60, 20))
    _png(tmp_path, f"{folder}/logo/logo.webp", (60, 20))

    run_inventory(tmp_path)
    assert _roles(rom.id) == {"box3d", "logo"}
    assert _source_of(f"{folder}/logo/logo.webp") == f"{folder}/logo/logo.png"

    for name in ("logo.png", "logo.webp"):
        (tmp_path / folder / "logo" / name).unlink()
    report = run_inventory(tmp_path)

    assert _roles(rom.id) == {"box3d"}
    assert report["media links removed"] == 1


def test_media_of_a_rom_that_no_longer_exists_is_not_linked(tmp_path: Path) -> None:
    _png(tmp_path, "roms/1/999999/box3d/box3d.png", (40, 50))

    report = run_inventory(tmp_path)

    assert report["media links written"] == 0
    assert "roms/1/999999/box3d/box3d.png" in _paths()


def _avg_color(path: str) -> str | None:
    with sync_session.begin() as session:
        return session.scalars(select(Image.avg_color).where(Image.path == path)).one()


def test_full_rereads_every_file_and_keeps_the_rows(
    tmp_path: Path, platform: Platform
) -> None:
    rom = make_rom(platform, "full")
    _write_library(tmp_path, rom)
    run_inventory(tmp_path)
    with sync_session.begin() as session:
        ids_before = dict(session.execute(select(Image.path, Image.id)).all())

    report = run_inventory(tmp_path, full=True)

    # The report holds only the counters that moved.
    assert report.get("unchanged", 0) == 0
    assert report.get("updated", 0) == 0
    with sync_session.begin() as session:
        assert dict(session.execute(select(Image.path, Image.id)).all()) == ids_before


def test_a_same_size_rewrite_is_caught_only_by_full(
    tmp_path: Path, platform: Platform
) -> None:
    rom = make_rom(platform, "rewrite")
    folder = _write_library(tmp_path, rom)
    big = f"{folder}/cover/big.png"
    run_inventory(tmp_path)
    before = _avg_color(big)
    size = (tmp_path / big).stat().st_size
    PILImage.new("RGB", (60, 90), (30, 20, 10)).save(tmp_path / big, "PNG")
    assert (tmp_path / big).stat().st_size == size

    run_inventory(tmp_path)
    assert _avg_color(big) == before

    run_inventory(tmp_path, full=True)
    assert _avg_color(big) != before


def test_progress_starts_at_zero_and_ends_at_the_total(
    tmp_path: Path, platform: Platform
) -> None:
    _write_library(tmp_path, make_rom(platform, "progress"))
    calls: list[tuple[int, int]] = []

    run_inventory(tmp_path, on_progress=lambda done, total: calls.append((done, total)))

    assert calls == [(0, 3), (3, 3)]


async def test_the_task_reports_progress_in_the_job_meta(
    tmp_path: Path, platform: Platform, mocker: MockerFixture
) -> None:
    _write_library(tmp_path, make_rom(platform, "meta"))
    mocker.patch.object(inventory_module, "RESOURCES_BASE_PATH", str(tmp_path))
    update_job_meta = mocker.patch("tasks.tasks.update_job_meta")

    await inventory_module.inventory_images_task.run()
    await asyncio.sleep(0)

    assert update_job_meta.call_args.args[0] == {
        "update_stats": {"processed": 3, "total": 3}
    }
