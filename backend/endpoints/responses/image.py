from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import Field

from config import FRONTEND_RESOURCES_PATH

from .base import BaseModel

if TYPE_CHECKING:
    from handler.database.images_handler import StoredImage

ART_COVER = "cover"
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
            "Pictures by role (`cover`, ...), each listing every file of that picture,"
            " widest first. A missing role means no such picture is known."
        ),
    )


def rom_art(covers: list[StoredImage], version: datetime) -> ArtMap:
    """The `art` value for a rom whose cover files are `covers`."""
    if not covers:
        return {}
    return {
        ART_COVER: [
            ArtFileSchema(
                url=f"{FRONTEND_RESOURCES_PATH}/{image.path}?ts={version}",
                width=image.width,
                height=image.height,
                type=_MIME_BY_FORMAT.get(image.format, f"image/{image.format.lower()}"),
            )
            for image in covers
        ]
    }
