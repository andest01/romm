from __future__ import annotations

from typing import TYPE_CHECKING

from pydantic import Field

from config import FRONTEND_RESOURCES_PATH
from models.image import COVER_LARGE, COVER_SMALL

from .base import BaseModel

if TYPE_CHECKING:
    from handler.database.images_handler import StoredImage

ART_COVER = "cover"
# Hex digits of the content hash in a URL: plenty to tell versions of one file apart.
VERSION_LENGTH = 16
# Pillow names a multi-picture JPEG "MPO"; browsers decode it as plain JPEG.
_MIME_BY_FORMAT = {"MPO": "image/jpeg"}


class ArtFileSchema(BaseModel):
    """One file of a picture: where to fetch it and what it is."""

    url: str
    width: int
    height: int
    type: str = Field(description="MIME type of the file's content")


ArtMap = dict[str, list[ArtFileSchema]]


class RomArtFields(BaseModel):
    art: ArtMap = Field(
        default_factory=dict,
        description=(
            "Pictures by role (`cover`, `box3d`, `logo`, ...: the media kinds), each"
            " listing every file of that picture, widest first, then smallest file"
            " first. A missing role means no such picture is known."
        ),
    )


def _url(image: StoredImage) -> str:
    url = f"{FRONTEND_RESOURCES_PATH}/{image.path}"
    # The bytes' hash: the URL changes exactly when the file does.
    if image.content_hash:
        url += f"?v={image.content_hash[:VERSION_LENGTH]}"
    return url


def rom_art(files: list[StoredImage]) -> ArtMap:
    """The `art` value for a rom whose linked files are `files`, in their order."""
    art: ArtMap = {}
    listed: set[tuple[str, str]] = set()
    for image in files:
        role = ART_COVER if image.role in (COVER_LARGE, COVER_SMALL) else image.role
        # small.png is linked as the small cover and is also the large one's copy.
        if (role, image.path) in listed:
            continue
        listed.add((role, image.path))
        art.setdefault(role, []).append(
            ArtFileSchema(
                url=_url(image),
                width=image.width,
                height=image.height,
                type=_MIME_BY_FORMAT.get(image.format, f"image/{image.format.lower()}"),
            )
        )
    return art
