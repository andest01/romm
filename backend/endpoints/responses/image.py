from pydantic import Field

from models.image import COVER_LARGE, COVER_SMALL

from .base import BaseModel


class ImageSizeSchema(BaseModel):
    width: int
    height: int


class CoverImagesSchema(BaseModel):
    """A rom's cover files, each null when the `images` table doesn't have it yet."""

    large: ImageSizeSchema | None = None
    small: ImageSizeSchema | None = None


class RomCoverFields(BaseModel):
    cover: CoverImagesSchema = Field(default_factory=CoverImagesSchema)


def cover_images(sizes_by_role: dict[str, tuple[int, int]]) -> CoverImagesSchema:
    """The `cover` value for a rom's cover sizes, keyed by role."""

    def size(role: str) -> ImageSizeSchema | None:
        found = sizes_by_role.get(role)
        return ImageSizeSchema(width=found[0], height=found[1]) if found else None

    return CoverImagesSchema(large=size(COVER_LARGE), small=size(COVER_SMALL))
