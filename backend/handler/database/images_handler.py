from collections.abc import Mapping, Sequence
from dataclasses import asdict, dataclass

from sqlalchemy import delete, select
from sqlalchemy.orm import InstrumentedAttribute, Session

from decorators.database import INJECTED_SESSION, begin_session
from models.collection import Collection
from models.image import (
    COVER_LARGE,
    COVER_SMALL,
    CollectionImage,
    Image,
    RomImage,
    compute_image_path_hash,
)
from models.rom import Rom

from .base_handler import DBBaseHandler


@dataclass(frozen=True)
class ImageFacts:
    """What one image file looks like, as stored on its `images` row."""

    path: str
    width: int
    height: int
    format: str
    bytes: int
    content_hash: str | None
    avg_color: str | None


@dataclass(frozen=True)
class StoredImage:
    """One linked image file: its resources-relative path, size and format."""

    path: str
    width: int
    height: int
    format: str


class DBImagesHandler(DBBaseHandler):
    @begin_session
    def get_cover_files_for_roms(
        self,
        rom_ids: list[int],
        *,
        session: Session = INJECTED_SESSION,
    ) -> dict[int, list[StoredImage]]:
        """Linked cover files, widest first, for the roms in `rom_ids` that have any."""
        if not rom_ids:
            return {}

        rows = session.execute(
            select(RomImage.rom_id, Image.path, Image.width, Image.height, Image.format)
            .join(Image, Image.id == RomImage.image_id)
            .where(
                RomImage.rom_id.in_(rom_ids),
                RomImage.role.in_((COVER_LARGE, COVER_SMALL)),
            )
            .order_by(RomImage.rom_id, Image.width.desc())
        ).all()
        files: dict[int, list[StoredImage]] = {}
        for rom_id, path, width, height, image_format in rows:
            files.setdefault(rom_id, []).append(
                StoredImage(path, width, height, image_format)
            )
        return files

    @begin_session
    def get_bytes_by_path(
        self, paths: Sequence[str], session: Session = INJECTED_SESSION
    ) -> dict[str, int]:
        """Stored size of each path in `paths` that has a row."""
        hashes = [compute_image_path_hash(path) for path in paths]
        rows = session.execute(
            select(Image.path, Image.bytes).where(Image.path_hash.in_(hashes))
        ).all()
        return {path: size for path, size in rows}

    @begin_session
    def upsert_images(
        self, rows: Sequence[ImageFacts], session: Session = INJECTED_SESSION
    ) -> tuple[int, int]:
        """Insert new paths and update changed ones; returns (inserted, updated)."""
        batch = {compute_image_path_hash(row.path): row for row in rows}
        existing = {
            image.path_hash: image
            for image in session.scalars(
                select(Image).where(Image.path_hash.in_(batch))
            ).all()
        }
        inserted = updated = 0
        for path_hash, row in batch.items():
            image = existing.get(path_hash)
            if image is None:
                session.add(Image(path_hash=path_hash, **asdict(row)))
                inserted += 1
            elif _facts_of(image) != row:
                for field, value in asdict(row).items():
                    setattr(image, field, value)
                updated += 1
        return inserted, updated

    @begin_session
    def link_covers(self, session: Session = INJECTED_SESSION) -> tuple[int, int]:
        """Point each rom's and collection's cover roles at the image its cover path names.

        Returns:
            (links written, links removed) across roms and collections.
        """
        roms = _link(
            session, RomImage, "rom_id", Rom.id, Rom.path_cover_l, Rom.path_cover_s
        )
        collections = _link(
            session,
            CollectionImage,
            "collection_id",
            Collection.id,
            Collection.path_cover_l,
            Collection.path_cover_s,
        )
        return roms[0] + collections[0], roms[1] + collections[1]

    @begin_session
    def link_sources(
        self,
        source_by_path: Mapping[str, str | None],
        session: Session = INJECTED_SESSION,
    ) -> int:
        """Point each image's `source_id` at the row of the original its path names.

        Args:
            source_by_path: Walked paths, each mapped to its original's path, or
                None for an original.

        Returns:
            How many rows changed.
        """
        raise NotImplementedError

    @begin_session
    def list_image_paths(
        self, session: Session = INJECTED_SESSION
    ) -> list[tuple[int, str]]:
        return [
            (image_id, path)
            for image_id, path in session.execute(select(Image.id, Image.path)).all()
        ]

    @begin_session
    def delete_images(
        self, image_ids: Sequence[int], session: Session = INJECTED_SESSION
    ) -> int:
        """Delete these rows; their `rom_images` / `collection_images` links cascade."""
        if not image_ids:
            return 0
        session.execute(delete(Image).where(Image.id.in_(image_ids)))
        return len(image_ids)


def _facts_of(image: Image) -> ImageFacts:
    return ImageFacts(
        path=image.path,
        width=image.width,
        height=image.height,
        format=image.format,
        bytes=image.bytes,
        content_hash=image.content_hash,
        avg_color=image.avg_color,
    )


def _link[Link: (RomImage, CollectionImage)](
    session: Session,
    link: type[Link],
    owner_name: str,
    owner_id: InstrumentedAttribute[int],
    large_path: InstrumentedAttribute[str | None],
    small_path: InstrumentedAttribute[str | None],
) -> tuple[int, int]:
    wanted = {
        (owner, role): image_id
        for role, column in ((COVER_LARGE, large_path), (COVER_SMALL, small_path))
        for owner, image_id in session.execute(
            select(owner_id, Image.id).join(Image, Image.path == column)
        ).all()
    }
    current = {
        (getattr(row, owner_name), row.role): row
        for row in session.scalars(select(link)).all()
    }
    written = 0
    for (owner, role), image_id in wanted.items():
        row = current.get((owner, role))
        if row is None:
            session.add(link(**{owner_name: owner, "role": role, "image_id": image_id}))
            written += 1
        elif row.image_id != image_id:
            row.image_id = image_id
            written += 1
    # A cover path that changed or was cleared no longer names its old image.
    stale = [row for key, row in current.items() if key not in wanted]
    for row in stale:
        session.delete(row)
    return written, len(stale)
