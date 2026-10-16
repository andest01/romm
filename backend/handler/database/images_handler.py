from collections.abc import Mapping, Sequence
from dataclasses import asdict, dataclass

from sqlalchemy import delete, or_, select
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

# Paths per `IN (...)` lookup, well under every driver's bound-parameter limit.
LOOKUP_BATCH = 500


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
    """One file of a rom's picture: the role it is linked under, and its facts."""

    role: str
    path: str
    width: int
    height: int
    format: str
    bytes: int


class DBImagesHandler(DBBaseHandler):
    @begin_session
    def get_art_files_for_roms(
        self,
        rom_ids: list[int],
        *,
        session: Session = INJECTED_SESSION,
    ) -> dict[int, list[StoredImage]]:
        """Every linked file and its copies, per rom, widest first, then smallest file."""
        if not rom_ids:
            return {}

        linked = (
            select(RomImage.rom_id, RomImage.role, RomImage.image_id)
            .where(RomImage.rom_id.in_(rom_ids))
            .subquery()
        )
        rows = session.execute(
            select(
                linked.c.rom_id,
                linked.c.role,
                Image.path,
                Image.width,
                Image.height,
                Image.format,
                Image.bytes,
            )
            .join(
                Image,
                or_(
                    Image.id == linked.c.image_id, Image.source_id == linked.c.image_id
                ),
            )
            .order_by(linked.c.rom_id, Image.width.desc(), Image.bytes, Image.path)
        ).all()
        files: dict[int, list[StoredImage]] = {}
        for rom_id, *facts in rows:
            files.setdefault(rom_id, []).append(StoredImage(*facts))
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
    def link_media(
        self,
        media_by_rom: Mapping[int, Mapping[str, str]],
        session: Session = INJECTED_SESSION,
    ) -> tuple[int, int]:
        """Link each rom's media originals under a role named after their kind.

        Args:
            media_by_rom: Walked roms, each mapped to {kind: original's path}; an
                empty map clears that rom's media links.

        Returns:
            (links written, links removed).
        """
        written = removed = 0
        rom_ids = list(media_by_rom)
        for start in range(0, len(rom_ids), LOOKUP_BATCH):
            chunk = rom_ids[start : start + LOOKUP_BATCH]
            # A folder can outlive its rom; linking it would break the foreign key.
            known = set(session.scalars(select(Rom.id).where(Rom.id.in_(chunk))).all())
            ids = self._ids_by_path(
                {path for rom_id in chunk for path in media_by_rom[rom_id].values()},
                session,
            )
            wanted = {
                (rom_id, kind): ids[path]
                for rom_id in chunk
                if rom_id in known
                for kind, path in media_by_rom[rom_id].items()
                if path in ids
            }
            current = {
                (row.rom_id, row.role): row
                for row in session.scalars(
                    select(RomImage).where(
                        RomImage.rom_id.in_(chunk),
                        RomImage.role.not_in((COVER_LARGE, COVER_SMALL)),
                    )
                ).all()
            }
            for (rom_id, kind), image_id in wanted.items():
                row = current.get((rom_id, kind))
                if row is None:
                    session.add(RomImage(rom_id=rom_id, role=kind, image_id=image_id))
                    written += 1
                elif row.image_id != image_id:
                    row.image_id = image_id
                    written += 1
            for key, row in current.items():
                if key not in wanted:
                    session.delete(row)
                    removed += 1
        return written, removed

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
            How many rows changed. A copy whose original wasn't walked is left with
            no source, so prune never cascades into files still on disk.
        """
        paths = list(source_by_path)
        changed = 0
        for start in range(0, len(paths), LOOKUP_BATCH):
            chunk = paths[start : start + LOOKUP_BATCH]
            images = session.scalars(
                select(Image).where(
                    Image.path_hash.in_([compute_image_path_hash(p) for p in chunk])
                )
            ).all()
            originals = self._ids_by_path(
                {source_by_path[image.path] for image in images} - {None}, session
            )
            for image in images:
                source = source_by_path[image.path]
                if source is not None and source_by_path.get(source) is not None:
                    raise ValueError(f"{image.path}: {source} is itself a copy")
                wanted = originals.get(source) if source else None
                if image.source_id != wanted:
                    image.source_id = wanted
                    changed += 1
        return changed

    def _ids_by_path(self, paths: set[str | None], session: Session) -> dict[str, int]:
        hashes = [compute_image_path_hash(p) for p in paths if p]
        if not hashes:
            return {}
        rows = session.execute(
            select(Image.path, Image.id).where(Image.path_hash.in_(hashes))
        ).all()
        return {path: image_id for path, image_id in rows}

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
        for row in session.scalars(
            select(link).where(link.role.in_((COVER_LARGE, COVER_SMALL)))
        ).all()
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
