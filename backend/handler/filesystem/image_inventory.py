"""Find image files under the resources folder by RomM's own folder conventions."""

import hashlib
import os
import re
from collections.abc import Iterator, Sequence
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Final, Literal

from PIL import Image as PILImage

from config.config_manager import MetadataMediaType
from handler.database.images_handler import ImageFacts
from handler.filesystem.base_handler import CoverSize
from utils.media_types import ALLOWED_IMAGE_EXTENSIONS

# Folder names that hold images; video and manuals stay out of the table.
NOT_IMAGE_MEDIA: Final = {
    MetadataMediaType.VIDEO,
    MetadataMediaType.VIDEO_NORMALIZED,
    MetadataMediaType.MANUAL,
}
IMAGE_KINDS: Final = frozenset(
    {"cover", "screenshots"}
    | {str(media) for media in MetadataMediaType if media not in NOT_IMAGE_MEDIA}
)

# `rom_fs_resources_path` and `Collection.fs_resources_path` lay these out.
ROM_IMAGE_PATH: Final = re.compile(
    r"^roms/(?P<platform_id>\d+)/(?P<owner_id>\d+)/(?P<kind>[a-z0-9_]+)/[^/]+$"
)
COLLECTION_COVER_PATH: Final = re.compile(
    r"^collections/(?P<owner_id>\d+)/(?P<kind>cover)/[^/]+$"
)


@dataclass(frozen=True)
class ImageLocation:
    owner: Literal["rom", "collection"]
    owner_id: int
    kind: str
    platform_id: int | None


def classify(path: str) -> ImageLocation | None:
    """What a resources-relative path is, or None when it isn't a known image."""
    if Path(path).suffix.lower() not in ALLOWED_IMAGE_EXTENSIONS:
        return None
    if match := ROM_IMAGE_PATH.match(path):
        if match["kind"] not in IMAGE_KINDS:
            return None
        return ImageLocation(
            "rom", int(match["owner_id"]), match["kind"], int(match["platform_id"])
        )
    if match := COLLECTION_COVER_PATH.match(path):
        return ImageLocation("collection", int(match["owner_id"]), "cover", None)
    return None


def _original_name(kind: str) -> str | None:
    # Every provider stores one file per media kind as <kind>/<kind>.png.
    if kind == "screenshots":
        return None
    return f"{CoverSize.BIG.value}.png" if kind == "cover" else f"{kind}.png"


def original_path(path: str) -> str | None:
    """The original that a cover or media file was made from.

    Args:
        path: A resources-relative path, as `classify` takes.

    Returns:
        The original in the same folder (`big.png` for covers, `<kind>.png` for
        media) when `path` is another file there, else None.
    """
    location = classify(path)
    name = _original_name(location.kind) if location else None
    if name is None:
        return None
    original = str(PurePosixPath(path).with_name(name))
    return None if original == path else original


def is_media_original(path: str, location: ImageLocation) -> bool:
    """Whether `path` is a rom's media original, such as `box3d/box3d.png`."""
    return (
        location.owner == "rom"
        and location.kind != "cover"
        and PurePosixPath(path).name == _original_name(location.kind)
    )


def iter_resource_files(root: Path, platform_ids: Sequence[int] = ()) -> Iterator[str]:
    """Every file under `roms/` (or only the given platforms) and `collections/`, relative to `root`."""
    tops = (
        [root / "roms" / str(platform_id) for platform_id in platform_ids]
        if platform_ids
        else [root / "roms", root / "collections"]
    )
    for top in tops:
        for directory, _, files in os.walk(top):
            for name in sorted(files):
                yield Path(directory, name).relative_to(root).as_posix()


def read_facts(root: Path, path: str) -> ImageFacts:
    """Header size and format, bytes, sha256 and average colour of one file."""
    full_path = root / path
    digest = hashlib.sha256(usedforsecurity=False)
    with full_path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    with PILImage.open(full_path) as image:
        width, height, image_format = image.width, image.height, image.format
        red, green, blue = image.convert("RGB").resize((1, 1)).getpixel((0, 0))  # type: ignore[misc]
    return ImageFacts(
        path=path,
        width=width,
        height=height,
        format=image_format or full_path.suffix.lstrip(".").upper(),
        bytes=full_path.stat().st_size,
        content_hash=digest.hexdigest(),
        avg_color=f"#{red:02x}{green:02x}{blue:02x}",
    )
