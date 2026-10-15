import hashlib
from typing import Final

from sqlalchemy import BigInteger, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from models.base import BaseModel

# Length of the sha256 hex digests stored in `Image.path_hash` and `content_hash`.
IMAGE_HASH_LENGTH: Final = 64
IMAGE_FORMAT_MAX_LENGTH: Final = 16
IMAGE_ROLE_MAX_LENGTH: Final = 16

COVER_LARGE: Final = "cover_large"
COVER_SMALL: Final = "cover_small"


def compute_image_path_hash(path: str) -> str:
    """Precompute the digest stored in `Image.path_hash`."""
    return hashlib.sha256(path.encode(), usedforsecurity=False).hexdigest()


class Image(BaseModel):
    """Facts about one image file under the resources folder; no row means unknown."""

    __tablename__ = "images"
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    path: Mapped[str] = mapped_column(Text)
    # A unique key on the path itself would exceed MariaDB's key length.
    path_hash: Mapped[str] = mapped_column(String(IMAGE_HASH_LENGTH), unique=True)
    width: Mapped[int] = mapped_column(Integer)
    height: Mapped[int] = mapped_column(Integer)
    format: Mapped[str] = mapped_column(String(IMAGE_FORMAT_MAX_LENGTH))
    bytes: Mapped[int] = mapped_column(BigInteger)
    content_hash: Mapped[str | None] = mapped_column(
        String(IMAGE_HASH_LENGTH), index=True
    )
    avg_color: Mapped[str | None] = mapped_column(String(7))


class RomImage(BaseModel):
    """Which image fills a rom's slot, such as its large cover."""

    __tablename__ = "rom_images"
    __table_args__ = {"extend_existing": True}

    rom_id: Mapped[int] = mapped_column(
        ForeignKey("roms.id", ondelete="CASCADE"), primary_key=True
    )
    role: Mapped[str] = mapped_column(String(IMAGE_ROLE_MAX_LENGTH), primary_key=True)
    image_id: Mapped[int] = mapped_column(
        ForeignKey("images.id", ondelete="CASCADE"), index=True
    )


class CollectionImage(BaseModel):
    """Which image fills a collection's slot, from its own cover files only."""

    __tablename__ = "collection_images"
    __table_args__ = {"extend_existing": True}

    collection_id: Mapped[int] = mapped_column(
        ForeignKey("collections.id", ondelete="CASCADE"), primary_key=True
    )
    role: Mapped[str] = mapped_column(String(IMAGE_ROLE_MAX_LENGTH), primary_key=True)
    image_id: Mapped[int] = mapped_column(
        ForeignKey("images.id", ondelete="CASCADE"), index=True
    )
